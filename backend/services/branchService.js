import Branch from '../models/Branch.js';
import AppError from '../utils/AppError.js';

export const createBranch = async (data, actorId) => {
  const code = data.branchCode.trim().toUpperCase();
  const existing = await Branch.findOne({ branchCode: code, isDeleted: false });
  if (existing) {
    throw new AppError('Branch code already registered', 409);
  }

  const branch = await Branch.create({
    ...data,
    branchCode: code,
    createdBy: actorId,
    updatedBy: actorId
  });

  return branch;
};

export const getAllBranches = async (scope) => {
  if (scope.isSuperAdmin) {
    return await Branch.find({ isDeleted: false }).sort({ createdAt: -1 });
  }
  
  return await Branch.find({ _id: scope.branchId, isDeleted: false });
};

export const getBranchById = async (id, scope) => {
  const branch = await Branch.findOne({ _id: id, isDeleted: false });
  if (!branch) {
    throw new AppError('Branch not found', 404);
  }

  if (!scope.isSuperAdmin && id !== scope.branchId.toString()) {
    throw new AppError('Access denied: branch mismatch', 403);
  }

  return branch;
};

export const updateBranch = async (id, data, actorId) => {
  const branch = await Branch.findOne({ _id: id, isDeleted: false });
  if (!branch) {
    throw new AppError('Branch not found', 404);
  }

  if (data.branchCode) {
    const code = data.branchCode.trim().toUpperCase();
    if (code !== branch.branchCode) {
      const existing = await Branch.findOne({ branchCode: code, isDeleted: false });
      if (existing) {
        throw new AppError('Branch code already in use', 409);
      }
    }
  }

  // Update properties
  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined) {
      branch[key] = data[key];
    }
  });

  branch.updatedBy = actorId;
  await branch.save();

  return branch;
};

export const updateBranchStatus = async (id, status, actorId) => {
  const branch = await Branch.findOne({ _id: id, isDeleted: false });
  if (!branch) {
    throw new AppError('Branch not found', 404);
  }

  branch.status = status;
  branch.updatedBy = actorId;
  await branch.save();

  return branch;
};
