import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendError } from '../utils/responseHandler.js';
import logger from '../config/logger.js';
import { ROLES } from '../constants/roles.js';

// Centralized Role Hierarchy Matrix
const roleHierarchy = {
  [ROLES.SUPER_ADMIN]: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CASHIER],
  [ROLES.ADMIN]: [ROLES.ADMIN, ROLES.CASHIER],
  [ROLES.CASHIER]: [ROLES.CASHIER]
};

/**
 * Protect routes by extracting and validating the JWT session cookie
 */
export const protect = async (req, res, next) => {
  let token = req.cookies?.jwt;

  if (!token) {
    return sendError(res, 'Not authorized, login required', 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find the user associated with the token, exclude sensitive data
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return sendError(res, 'User session no longer exists', 401);
    }

    if (user.isDeleted) {
      return sendError(res, 'Your account has been deleted.', 403);
    }

    if (user.status !== 'ACTIVE') {
      return sendError(res, `Your account status is ${user.status}. Contact an administrator.`, 403);
    }

    // Check if password was changed after token was issued (stateless logout of all active sessions)
    if (user.passwordChangedAt && decoded.iat * 1000 < user.passwordChangedAt.getTime()) {
      return sendError(res, 'Password was recently changed. Please sign in again.', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    logger.warn(`Failed token authorization attempt: ${error.message}`);
    return sendError(res, 'Session expired or invalid, please login again', 401);
  }
};

/**
 * Centralized authorization check based on role hierarchy
 */
export const authorize = (...requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Not authorized', 401);
    }

    const userGrantedRoles = roleHierarchy[req.user.role] || [];
    
    // Check if user has permission matching any required roles
    const hasAccess = requiredRoles.some(role => userGrantedRoles.includes(role));

    if (!hasAccess) {
      logger.warn(`Access denied: User ${req.user.username} (Role: ${req.user.role}) tried to access routes requiring [${requiredRoles.join(', ')}]`);
      return sendError(
        res,
        'Access denied: you do not have sufficient privileges to perform this action.',
        403
      );
    }
    next();
  };
};
