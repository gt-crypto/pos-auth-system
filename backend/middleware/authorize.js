import { ROLE_PERMISSIONS } from '../config/rolePermissions.js';
import { sendError } from '../utils/responseHandler.js';
import logger from '../config/logger.js';

export const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Not authorized', 401);
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
    if (!userPermissions.includes(permission)) {
      logger.warn(`Access denied: User ${req.user.username} (Role: ${req.user.role}) lacks permission [${permission}]`);
      return sendError(res, 'Access denied: you do not have sufficient privileges to perform this action.', 403);
    }
    next();
  };
};
