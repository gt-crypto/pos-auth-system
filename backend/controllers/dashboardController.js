import { sendSuccess } from '../utils/responseHandler.js';
import { ROLE_PERMISSIONS } from '../config/rolePermissions.js';
import { getBranchById } from '../services/branchService.js';
import asyncHandler from '../utils/asyncHandler.js';

// Branch lookup is now delegated to branchService — no raw DB calls in controllers.

export const getDashboardMe = asyncHandler(async (req, res) => {
  const { role, branchId } = req.user;
  const permissions = ROLE_PERMISSIONS[role] ?? [];

  const branch = branchId
    ? await getBranchById(branchId, { isSuperAdmin: false, branchId })
    : null;

  return sendSuccess(res, 'Dashboard summary details retrieved successfully', {
    role,
    permissions,
    branch
  });
});
