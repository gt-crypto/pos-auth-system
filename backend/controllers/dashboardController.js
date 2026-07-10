import { sendSuccess } from '../utils/responseHandler.js';
import { ROLE_PERMISSIONS } from '../config/rolePermissions.js';
import Branch from '../models/Branch.js';

export const getDashboardMe = async (req, res, next) => {
  try {
    const role = req.user.role;
    const permissions = ROLE_PERMISSIONS[role] || [];
    
    let branchDetails = null;
    if (req.user.branchId) {
      branchDetails = await Branch.findOne({ _id: req.user.branchId, isDeleted: false });
    }

    return sendSuccess(res, 'Dashboard summary details retrieved successfully', {
      role,
      permissions,
      branch: branchDetails
    });
  } catch (err) {
    next(err);
  }
};
