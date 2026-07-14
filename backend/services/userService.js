import User from '../models/User.js';
import Branch from '../models/Branch.js';
import { ROLES } from '../constants/roles.js';
import AppError from '../utils/AppError.js';

import { logAudit } from '../utils/auditLogger.js';

export const createUser = async (data, actorUser, req) => {
  const usernameLower = data.username.trim().toLowerCase();
  const emailLower = data.email.trim().toLowerCase();

  // Check unique constraints
  const usernameExists = await User.findOne({ username: usernameLower });
  if (usernameExists) {
    throw new AppError('Username already taken', 409);
  }

  const emailExists = await User.findOne({ email: emailLower });
  if (emailExists) {
    throw new AppError('Email already registered', 409);
  }

  // Branch checks
  if (data.role === ROLES.ADMIN || data.role === ROLES.CASHIER) {
    if (!data.branchId) {
      throw new AppError('Branch assignment is required', 400);
    }

    const branch = await Branch.findOne({ _id: data.branchId, isDeleted: false });
    if (!branch) {
      throw new AppError('Assigned branch does not exist', 404);
    }

    if (branch.status === 'INACTIVE') {
      throw new AppError('Cannot assign users to an inactive branch', 400);
    }
  }

  // Actor checks
  if (actorUser.role === ROLES.ADMIN) {
    if (data.role !== ROLES.CASHIER) {
      throw new AppError('Admins are only authorized to create Cashiers', 403);
    }
    data.branchId = actorUser.branchId.toString(); // Admin must assign Cashier to own branch
  }

  const user = await User.create({
    ...data,
    username: usernameLower,
    email: emailLower,
    status: 'ACTIVE', // Approved immediately since created by Admin/Super Admin
    createdBy: actorUser._id
  });

  await logAudit({
    actor: actorUser._id,
    action: 'CREATE_USER',
    entityType: 'User',
    entityId: user._id,
    branchId: user.branchId || null,
    metadata: { username: user.username, role: user.role },
    req
  });

  return user;
};

export const getAllUsers = async (scope) => {
  if (scope.isSuperAdmin) {
    return await User.find({ isDeleted: false })
      .select('-password')
      .populate('branchId', 'name branchCode')
      .sort({ createdAt: -1 });
  }

  // Admin: Return own branch cashiers only
  return await User.find({
    branchId: scope.branchId,
    role: ROLES.CASHIER,
    isDeleted: false
  })
    .select('-password')
    .populate('branchId', 'name branchCode')
    .sort({ createdAt: -1 });
};

export const getUserById = async (id, scope) => {
  const user = await User.findOne({ _id: id, isDeleted: false })
    .select('-password')
    .populate('branchId', 'name branchCode');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!scope.isSuperAdmin) {
    if (user.branchId?._id?.toString() !== scope.branchId.toString() || user.role !== ROLES.CASHIER) {
      throw new AppError('Access denied: branch mismatch or insufficient privileges', 403);
    }
  }

  return user;
};

export const updateUser = async (id, data, actorUser, req) => {
  const user = await User.findOne({ _id: id, isDeleted: false });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Self-protection
  if (user._id.toString() === actorUser._id.toString()) {
    if (data.role && data.role !== user.role) {
      throw new AppError('You cannot change your own role', 400);
    }
  }

  if (actorUser.role === ROLES.ADMIN) {
    // Admin checks: must be in same branch and target must be Cashier
    if (user.branchId?.toString() !== actorUser.branchId.toString() || user.role !== ROLES.CASHIER) {
      throw new AppError('Access denied: branch mismatch or insufficient privileges', 403);
    }

    // Strip protected fields
    delete data.role;
    delete data.branchId;
    delete data.createdBy;
    delete data.email;
  }

  if (actorUser.role === ROLES.SUPER_ADMIN) {
    // Super admin role change lockout checks
    if (user.role === ROLES.SUPER_ADMIN && data.role && data.role !== ROLES.SUPER_ADMIN) {
      const activeSuperAdminCount = await User.countDocuments({
        role: ROLES.SUPER_ADMIN,
        status: 'ACTIVE',
        isDeleted: false
      });
      if (activeSuperAdminCount <= 1) {
        throw new AppError('Cannot demote the last remaining Super Admin', 400);
      }
    }

    // Branch active validation if modifying branchId
    if (data.branchId && data.branchId !== user.branchId?.toString()) {
      const branch = await Branch.findOne({ _id: data.branchId, isDeleted: false });
      if (!branch) {
        throw new AppError('New branch does not exist', 404);
      }
      if (branch.status === 'INACTIVE') {
        throw new AppError('Cannot assign users to an inactive branch', 400);
      }
    }
  }

  // Update password changed timestamp if modifying password
  if (data.password) {
    user.passwordChangedAt = new Date();
  }

  // Track triggers for audit log
  let roleChanged = false;
  let oldRole = user.role;
  if (data.role && data.role !== user.role) {
    roleChanged = true;
    user.roleHistory.push({
      changedBy: actorUser._id,
      oldRole: user.role,
      newRole: data.role,
      changedAt: new Date()
    });
  }

  let ingredientsAccessChange = null;
  if (data.hasIngredientsAccess !== undefined && data.hasIngredientsAccess !== user.hasIngredientsAccess) {
    ingredientsAccessChange = data.hasIngredientsAccess ? 'GRANT' : 'REVOKE';
  }

  // Update properties
  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined) {
      user[key] = data[key];
    }
  });

  await user.save();

  // Log Audits after successful save
  if (roleChanged) {
    await logAudit({
      actor: actorUser._id,
      action: 'ROLE_CHANGED',
      entityType: 'User',
      entityId: user._id,
      branchId: user.branchId || null,
      metadata: { oldRole, newRole: user.role },
      req
    });
  }

  if (ingredientsAccessChange) {
    await logAudit({
      actor: actorUser._id,
      action: ingredientsAccessChange === 'GRANT' ? 'INGREDIENTS_ACCESS_GRANTED' : 'INGREDIENTS_ACCESS_REVOKED',
      entityType: 'User',
      entityId: user._id,
      branchId: user.branchId || null,
      metadata: { username: user.username },
      req
    });
  }

  await logAudit({
    actor: actorUser._id,
    action: 'UPDATE_USER',
    entityType: 'User',
    entityId: user._id,
    branchId: user.branchId || null,
    metadata: { username: user.username },
    req
  });

  return user;
};

export const updateUserStatus = async (id, status, actorUser, req) => {
  const user = await User.findOne({ _id: id, isDeleted: false });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (actorUser.role === ROLES.ADMIN) {
    if (user.branchId?.toString() !== actorUser.branchId.toString() || user.role !== ROLES.CASHIER) {
      throw new AppError('Access denied: branch mismatch or insufficient privileges', 403);
    }
    // Admin can only set to ACTIVE or INACTIVE
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      throw new AppError('Invalid status modification', 400);
    }
  }

  if (user._id.toString() === actorUser._id.toString() && status !== 'ACTIVE') {
    throw new AppError('You cannot deactivate your own account', 400);
  }

  // Last Super Admin protection
  if (user.role === ROLES.SUPER_ADMIN && status !== 'ACTIVE') {
    const activeSuperAdminCount = await User.countDocuments({
      role: ROLES.SUPER_ADMIN,
      status: 'ACTIVE',
      isDeleted: false
    });
    if (activeSuperAdminCount <= 1) {
      throw new AppError('Cannot demote or deactivate the last remaining Super Admin', 400);
    }
  }

  user.status = status;
  await user.save();

  await logAudit({
    actor: actorUser._id,
    action: 'UPDATE_USER',
    entityType: 'User',
    entityId: user._id,
    branchId: user.branchId || null,
    metadata: { username: user.username, status },
    req
  });

  return user;
};

export const deactivateUser = async (id, actorUser, req) => {
  const user = await User.findOne({ _id: id, isDeleted: false });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (actorUser.role === ROLES.ADMIN) {
    if (user.branchId?.toString() !== actorUser.branchId.toString() || user.role !== ROLES.CASHIER) {
      throw new AppError('Access denied: branch mismatch or insufficient privileges', 403);
    }
  }

  if (user._id.toString() === actorUser._id.toString()) {
    throw new AppError('You cannot deactivate your own account', 400);
  }

  // Last Super Admin protection
  if (user.role === ROLES.SUPER_ADMIN) {
    const activeSuperAdminCount = await User.countDocuments({
      role: ROLES.SUPER_ADMIN,
      status: 'ACTIVE',
      isDeleted: false
    });
    if (activeSuperAdminCount <= 1) {
      throw new AppError('Cannot deactivate the last remaining Super Admin', 400);
    }
  }

  user.isDeleted = true;
  user.status = 'INACTIVE';
  await user.save();

  await logAudit({
    actor: actorUser._id,
    action: 'DELETE_USER',
    entityType: 'User',
    entityId: user._id,
    branchId: user.branchId || null,
    metadata: { username: user.username },
    req
  });

  return user;
};

// ─── User Approval Flow ────────────────────────────────────────────────────────

export const getPendingUsers = async () => {
  return await User.find({ status: 'PENDING', isDeleted: false })
    .select('-password')
    .populate('branchId', 'name branchCode')
    .sort({ createdAt: -1 });
};

export const approveUser = async (id, actorUser, req) => {
  const user = await User.findOne({ _id: id, isDeleted: false });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.status !== 'PENDING') {
    throw new AppError(`User is already ${user.status.toLowerCase()} — cannot approve`, 400);
  }

  user.status = 'ACTIVE';
  user.approvedBy = actorUser._id;
  user.approvedAt = new Date();
  await user.save();

  await logAudit({
    actor: actorUser._id,
    action: 'APPROVE_USER',
    entityType: 'User',
    entityId: user._id,
    branchId: user.branchId || null,
    metadata: { username: user.username, role: user.role },
    req
  });

  return user;
};

export const rejectUser = async (id, actorUser, req) => {
  const user = await User.findOne({ _id: id, isDeleted: false });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.status !== 'PENDING') {
    throw new AppError(`User is already ${user.status.toLowerCase()} — cannot reject`, 400);
  }

  user.status = 'INACTIVE';
  user.rejectedBy = actorUser._id;
  user.rejectedAt = new Date();
  await user.save();

  await logAudit({
    actor: actorUser._id,
    action: 'REJECT_USER',
    entityType: 'User',
    entityId: user._id,
    branchId: user.branchId || null,
    metadata: { username: user.username, role: user.role },
    req
  });

  return user;
};
