import { ROLES } from '../constants/roles.js';
import { sendError } from '../utils/responseHandler.js';

export const branchScope = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'Not authorized', 401);
  }

  const isSuperAdmin = req.user.role === ROLES.SUPER_ADMIN;

  if (!isSuperAdmin && !req.user.branchId) {
    return sendError(res, 'Access denied: account must be assigned to an active branch.', 403);
  }

  req.scope = {
    role: req.user.role,
    branchId: req.user.branchId,
    isSuperAdmin
  };

  next();
};
