import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Branch from '../models/Branch.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { sendResetPasswordEmail } from '../services/emailService.js';
import { LOCKOUT_RULES } from '../constants/auth.js';
import { ROLES } from '../constants/roles.js';
import logger from '../config/logger.js';
import { logAudit } from '../utils/auditLogger.js';

/**
 * Generate JWT and set it in HttpOnly Secure Cookie
 */
const sendTokenResponse = (user, statusCode, res, message, rememberMe = false) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '24h'
  });

  const cookieOptions = {
    httpOnly: true
  };

  if (rememberMe) {
    const cookieExpireHours = parseInt(process.env.COOKIE_EXPIRE || '24', 10);
    cookieOptions.expires = new Date(Date.now() + cookieExpireHours * 60 * 60 * 1000);
  }

  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
    cookieOptions.sameSite = 'none';
  } else {
    cookieOptions.secure = false;
    cookieOptions.sameSite = 'lax';
  }

  res.cookie('jwt', token, cookieOptions);

  return sendSuccess(res, message, {
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      loginHistory: user.loginHistory?.slice(-5) || []
    }
  }, statusCode);
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { username, name, email, password } = req.validatedBody;
    const rawInviteCode = req.body.inviteCode;

    // Strict Role Escalation Prevention: strip out any raw roles or status parameters
    delete req.body.role;
    delete req.body.status;

    // Username Case-Insensitivity Check: Normalize username and check availability
    const usernameLower = username.trim().toLowerCase();
    const usernameExists = await User.findOne({ username: usernameLower });
    if (usernameExists) {
      return sendError(res, 'Username already taken', 400);
    }

    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return sendError(res, 'Email already registered', 400);
    }

    // Sanitize invite code input
    const sanitizedCode = typeof rawInviteCode === 'string' 
      ? rawInviteCode.trim().toUpperCase() 
      : '';

    // Username pattern match checks
    const isSuperAdminRequest = /^superadmin[0-9]*$/i.test(usernameLower);
    const isAdminRequest = /^admin[0-9]*$/i.test(usernameLower);

    // Initial role and status values
    let assignedRole = ROLES.CASHIER;
    let assignedStatus = 'PENDING';
    let isCodeUsed = false;

    // Fetch env codes
    const superAdminInviteCode = (process.env.SUPER_ADMIN_INVITE || 'SUPER2026').trim().toUpperCase();
    const adminInviteCode = (process.env.ADMIN_INVITE || 'ADMIN2026').trim().toUpperCase();

    // Check invite match criteria
    if (isSuperAdminRequest && sanitizedCode === superAdminInviteCode) {
      // Bootstrap Exception:
      // In production, invite codes should be database-backed records or expiring tokens.
      // We check if any approved SUPER_ADMIN currently exists. If not, bootstrap approve the first one.
      const existingSuperAdmins = await User.countDocuments({ role: ROLES.SUPER_ADMIN, status: 'ACTIVE' });
      assignedRole = ROLES.SUPER_ADMIN;
      assignedStatus = existingSuperAdmins === 0 ? 'ACTIVE' : 'PENDING';
      isCodeUsed = true;
    } else if (isAdminRequest && sanitizedCode === adminInviteCode) {
      assignedRole = ROLES.ADMIN;
      assignedStatus = 'PENDING';
      isCodeUsed = true;
    }

    const user = await User.create({
      username: usernameLower,
      name,
      email: email.toLowerCase(),
      password,
      role: assignedRole,
      status: assignedStatus,
      inviteCodeUsed: isCodeUsed,
      createdBy: null // self-registered
    });

    logger.info(`User registered successfully: ${user.username} (Role: ${user.role}, Status: ${user.status})`);
    return sendSuccess(res, 'Registration successful. Awaiting administrator approval.', {}, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { username, password, rememberMe = false } = req.validatedBody;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown Device';

    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user) {
      logger.warn(`Login failed: Username '${username}' not found.`);
      await logAudit({
        actor: '000000000000000000000000',
        performedByRole: 'SYSTEM',
        action: 'FAILED_LOGIN',
        entityType: 'User',
        entityId: '000000000000000000000000',
        metadata: { username },
        req
      });
      return sendError(res, 'Invalid username or password', 401);
    }

    // Check lockout
    if (user.isLocked()) {
      const lockRemaining = Math.ceil((user.accountLockedUntil - Date.now()) / 1000 / 60);
      logger.warn(`Login blocked: Account locked for user '${user.username}'.`);
      return sendError(
        res,
        `Your account has been temporarily locked due to multiple failed login attempts. Please try again in ${lockRemaining} minute(s).`,
        423
      );
    }

    // Match password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      user.failedLoginAttempts += 1;
      user.lastFailedLogin = new Date();

      let isLocked = false;
      if (user.failedLoginAttempts >= LOCKOUT_RULES.MAX_FAILED_ATTEMPTS) {
        user.accountLockedUntil = new Date(Date.now() + LOCKOUT_RULES.LOCKOUT_DURATION_MS);
        logger.warn(`Account locked due to 5 failures: '${user.username}'`);
        isLocked = true;
      }

      await user.save();
      
      if (isLocked) {
        await logAudit({
          actor: user._id,
          performedByRole: user.role,
          action: 'ACCOUNT_LOCKED',
          entityType: 'User',
          entityId: user._id,
          branchId: user.branchId || null,
          metadata: { username: user.username },
          req
        });
      }

      await logAudit({
        actor: user._id,
        performedByRole: user.role,
        action: 'FAILED_LOGIN',
        entityType: 'User',
        entityId: user._id,
        branchId: user.branchId || null,
        metadata: { username: user.username },
        req
      });

      if (user.isLocked()) {
        return sendError(
          res,
          'Your account has been temporarily locked due to multiple failed login attempts.',
          423
        );
      }

      return sendError(res, 'Invalid username or password', 401);
    }

    // Verify soft delete
    if (user.isDeleted) {
      logger.warn(`Login blocked: User '${user.username}' has been deleted.`);
      return sendError(res, 'Your account has been deleted.', 403);
    }

    // Verify account status
    if (user.status === 'PENDING') {
      logger.warn(`Login blocked: User '${user.username}' is pending approval.`);
      return sendError(res, 'Your account is awaiting approval from an administrator.', 403);
    }

    if (user.status === 'INACTIVE') {
      logger.warn(`Login blocked: User '${user.username}' is inactive.`);
      return sendError(res, 'Your account is inactive. Please contact your administrator.', 403);
    }

    if (user.status === 'SUSPENDED') {
      logger.warn(`Login blocked: User '${user.username}' is suspended.`);
      return sendError(res, 'Your account is suspended. Please contact your administrator.', 403);
    }

    // Verify assigned branch is active
    if (user.branchId) {
      const branch = await Branch.findOne({ _id: user.branchId, isDeleted: false });
      if (!branch || branch.status === 'INACTIVE') {
        logger.warn(`Login blocked: Branch '${user.branchId}' for user '${user.username}' is inactive/deleted.`);
        return sendError(res, 'Your branch is currently inactive. Please contact your administrator.', 403);
      }
    }

    // Reset lockout counters and login successfully
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.lastLogin = new Date();
    
    user.loginHistory.push({ ipAddress, userAgent, loginTime: new Date() });
    if (user.loginHistory.length > 20) {
      user.loginHistory.shift();
    }

    await user.save();

    await logAudit({
      actor: user._id,
      performedByRole: user.role,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user._id,
      branchId: user.branchId || null,
      metadata: { username: user.username },
      req
    });

    logger.info(`User logged in: ${user.username} from IP: ${ipAddress}`);
    return sendTokenResponse(user, 200, res, 'Logged in successfully', rememberMe);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user & Clear Session Cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
export const logout = async (req, res, next) => {
  try {
    const cookieOptions = {
      expires: new Date(0),
      httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') {
      cookieOptions.secure = true;
      cookieOptions.sameSite = 'none';
    } else {
      cookieOptions.secure = false;
      cookieOptions.sameSite = 'lax';
    }

    res.cookie('jwt', '', cookieOptions);
    if (req.user) {
      await logAudit({
        actor: req.user._id,
        action: 'LOGOUT',
        entityType: 'User',
        entityId: req.user._id,
        branchId: req.user.branchId || null,
        req
      });
    }
    logger.info('User session cleared.');
    return sendSuccess(res, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Initiate forgot password reset link
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.validatedBody;
    const user = await User.findOne({ email });

    const responseMsg = 'If that email is registered, a password reset link has been sent.';

    if (!user) {
      logger.info(`Forgot password requested for non-existent email: ${email}`);
      return sendSuccess(res, responseMsg);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    try {
      await sendResetPasswordEmail(user.email, user.username, resetUrl);
      return sendSuccess(res, responseMsg);
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
      
      logger.error(`Reset password email sending failed: ${err.message}`);
      return sendError(res, 'Could not send reset password email. Please try again.', 500);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset user password using token
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { password } = req.validatedBody;
    
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return sendError(res, 'Password reset link is invalid or has expired', 400);
    }

    user.password = password;
    user.passwordChangedAt = new Date();
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;

    await user.save();

    await logAudit({
      actor: user._id,
      performedByRole: user.role,
      action: 'PASSWORD_RESET',
      entityType: 'User',
      entityId: user._id,
      branchId: user.branchId || null,
      metadata: { username: user.username },
      req
    });

    logger.info(`Password reset successfully for user: ${user.username}`);
    return sendSuccess(res, 'Password updated successfully. Please login.');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change logged-in user password
 * @route   POST /api/auth/change-password
 * @access  Private
 */
export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.validatedBody;
    const user = await User.findById(req.user.id);

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return sendError(res, 'Incorrect current password', 400);
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    await logAudit({
      actor: user._id,
      performedByRole: user.role,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: user._id,
      branchId: user.branchId || null,
      metadata: { username: user.username },
      req
    });

    logger.info(`Password changed securely for user: ${user.username}`);
    res.clearCookie('jwt');
    return sendSuccess(res, 'Password changed successfully. Please login again.');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    return sendSuccess(res, 'Session active', { user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify if username is available
 * @route   GET /api/auth/check-username/:username
 * @access  Public
 */
export const checkUsername = async (req, res, next) => {
  try {
    const { username } = req.params;
    
    if (!/^[a-zA-Z0-9_]{4,20}$/.test(username)) {
      return sendSuccess(res, 'Username criteria not met', { available: false });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    return sendSuccess(res, 'Availability calculated', { available: !user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify if email is available
 * @route   GET /api/auth/check-email/:email
 * @access  Public
 */
export const checkEmail = async (req, res, next) => {
  try {
    const { email } = req.params;
    const emailLower = email.toLowerCase();
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      return sendSuccess(res, 'Email criteria not met', { available: false });
    }

    const user = await User.findOne({ email: emailLower });
    return sendSuccess(res, 'Availability calculated', { available: !user });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// ADMIN USER MANAGEMENT ENDPOINTS
// =========================================================================

/**
 * @desc    Get all users list (Admins & Super Admins)
 * @route   GET /api/auth/users
 * @access  Private (SUPER_ADMIN, ADMIN)
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({})
      .select('-password')
      .populate('createdBy', 'username email')
      .populate('approvedBy', 'username email')
      .populate('rejectedBy', 'username email')
      .populate('roleHistory.changedBy', 'username email')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Users list retrieved successfully', { users });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve user account (Admins & Super Admins)
 * @route   PUT /api/auth/users/:id/approve
 * @access  Private (SUPER_ADMIN, ADMIN)
 */
export const approveUser = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const targetUser = await User.findById(targetId);

    if (!targetUser) {
      return sendError(res, 'User not found', 404);
    }

    // Role restrictions: Admins may only approve Cashier accounts
    if (req.user.role === ROLES.ADMIN && targetUser.role !== ROLES.CASHIER) {
      return sendError(res, 'Admins are only authorized to approve Cashier accounts.', 403);
    }

    targetUser.status = 'APPROVED';
    targetUser.approvedBy = req.user._id;
    targetUser.approvedAt = new Date();
    targetUser.rejectedBy = null; // clear any rejection log if approving
    targetUser.rejectedAt = null;

    await targetUser.save();
    
    logger.info(`User ${targetUser.username} approved by ${req.user.username}`);
    return sendSuccess(res, `User '${targetUser.username}' account has been approved.`);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject user account (Admins & Super Admins)
 * @route   PUT /api/auth/users/:id/reject
 * @access  Private (SUPER_ADMIN, ADMIN)
 */
export const rejectUser = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const targetUser = await User.findById(targetId);

    if (!targetUser) {
      return sendError(res, 'User not found', 404);
    }

    // Role restrictions: Admins may only reject Cashier accounts
    if (req.user.role === ROLES.ADMIN && targetUser.role !== ROLES.CASHIER) {
      return sendError(res, 'Admins are only authorized to reject Cashier accounts.', 403);
    }

    targetUser.status = 'REJECTED';
    targetUser.rejectedBy = req.user._id;
    targetUser.rejectedAt = new Date();
    targetUser.approvedBy = null; // clear approval logs
    targetUser.approvedAt = null;

    await targetUser.save();
    
    logger.info(`User ${targetUser.username} rejected by ${req.user.username}`);
    return sendSuccess(res, `User '${targetUser.username}' account has been rejected.`);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Promote/Demote/Modify user role
 * @route   PUT /api/auth/users/:id/role
 * @access  Private (SUPER_ADMIN)
 */
export const changeUserRole = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const { newRole } = req.body;

    if (!Object.values(ROLES).includes(newRole)) {
      return sendError(res, 'Invalid role specification', 400);
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      return sendError(res, 'User not found', 404);
    }

    // Self-Protection check: prevent changing own role
    if (targetUser._id.toString() === req.user._id.toString()) {
      return sendError(res, 'You cannot modify your own role.', 400);
    }

    // Last Super Admin Protection check
    if (targetUser.role === ROLES.SUPER_ADMIN && newRole !== ROLES.SUPER_ADMIN) {
      const activeSuperAdminCount = await User.countDocuments({ role: ROLES.SUPER_ADMIN, status: 'APPROVED' });
      if (activeSuperAdminCount <= 1) {
        return sendError(res, 'Cannot demote the last remaining Super Admin.', 400);
      }
    }

    // Log the audit trail history
    targetUser.roleHistory.push({
      changedBy: req.user._id,
      oldRole: targetUser.role,
      newRole,
      changedAt: new Date()
    });

    targetUser.role = newRole;
    await targetUser.save();

    logger.info(`User ${targetUser.username} role changed from ${targetUser.role} to ${newRole} by ${req.user.username}`);
    return sendSuccess(res, `User role changed successfully to ${newRole}`);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user account
 * @route   DELETE /api/auth/users/:id
 * @access  Private (SUPER_ADMIN)
 */
export const deleteUser = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const targetUser = await User.findById(targetId);

    if (!targetUser) {
      return sendError(res, 'User not found', 404);
    }

    // Self-Protection check: prevent deleting own account
    if (targetUser._id.toString() === req.user._id.toString()) {
      return sendError(res, 'You cannot delete your own account.', 400);
    }

    // Last Super Admin Protection check
    if (targetUser.role === ROLES.SUPER_ADMIN) {
      const activeSuperAdminCount = await User.countDocuments({ role: ROLES.SUPER_ADMIN, status: 'APPROVED' });
      if (activeSuperAdminCount <= 1) {
        return sendError(res, 'Cannot delete the last remaining Super Admin.', 400);
      }
    }

    await User.findByIdAndDelete(targetId);
    
    logger.info(`User ${targetUser.username} deleted by Super Admin: ${req.user.username}`);
    return sendSuccess(res, `User '${targetUser.username}' deleted successfully.`);
  } catch (error) {
    next(error);
  }
};
