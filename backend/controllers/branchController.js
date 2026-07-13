import * as branchService from '../services/branchService.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { logAudit } from '../utils/auditLogger.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../config/logger.js';

export const createBranch = asyncHandler(async (req, res) => {
  const branch = await branchService.createBranch(req.validatedBody, req.user._id);

  await logAudit({
    actor: req.user._id,
    action: 'CREATE_BRANCH',
    entityType: 'Branch',
    entityId: branch._id,
    branchId: branch._id,
    metadata: { newBranch: branch },
    req
  });

  logger.info(`Branch '${branch.name}' created by user: ${req.user.username}`);
  return sendSuccess(res, 'Branch created successfully', { branch }, 201);
});

export const getAllBranches = asyncHandler(async (req, res) => {
  const branches = await branchService.getAllBranches(req.scope);
  return sendSuccess(res, 'Branches retrieved successfully', { branches });
});

export const getBranchById = asyncHandler(async (req, res) => {
  const branch = await branchService.getBranchById(req.params.id, req.scope);
  return sendSuccess(res, 'Branch details retrieved successfully', { branch });
});

export const updateBranch = asyncHandler(async (req, res) => {
  const originalBranch = await branchService.getBranchById(req.params.id, req.scope);
  const updatedBranch = await branchService.updateBranch(req.params.id, req.validatedBody, req.user._id);

  await logAudit({
    actor: req.user._id,
    action: 'UPDATE_BRANCH',
    entityType: 'Branch',
    entityId: updatedBranch._id,
    branchId: updatedBranch._id,
    metadata: {
      oldValues: { name: originalBranch.name, managerName: originalBranch.managerName, status: originalBranch.status },
      newValues: { name: updatedBranch.name, managerName: updatedBranch.managerName, status: updatedBranch.status }
    },
    req
  });

  logger.info(`Branch '${updatedBranch.name}' updated by user: ${req.user.username}`);
  return sendSuccess(res, 'Branch updated successfully', { branch: updatedBranch });
});

export const updateBranchStatus = asyncHandler(async (req, res) => {
  const originalBranch = await branchService.getBranchById(req.params.id, req.scope);
  const updatedBranch = await branchService.updateBranchStatus(req.params.id, req.validatedBody.status, req.user._id);

  await logAudit({
    actor: req.user._id,
    action: 'UPDATE_BRANCH_STATUS',
    entityType: 'Branch',
    entityId: updatedBranch._id,
    branchId: updatedBranch._id,
    metadata: {
      oldStatus: originalBranch.status,
      newStatus: updatedBranch.status
    },
    req
  });

  logger.info(`Branch '${updatedBranch.name}' status changed to '${updatedBranch.status}' by user: ${req.user.username}`);
  return sendSuccess(res, 'Branch status updated successfully', { branch: updatedBranch });
});

export const getMyBranch = asyncHandler(async (req, res) => {
  if (!req.user.branchId) {
    return sendError(res, 'You are not assigned to any branch', 400);
  }
  const branch = await branchService.getBranchById(req.user.branchId, req.scope);
  return sendSuccess(res, 'Own branch retrieved successfully', { branch });
});
