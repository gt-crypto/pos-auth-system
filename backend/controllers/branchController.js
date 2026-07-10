import * as branchService from '../services/branchService.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { logAudit } from '../utils/auditLogger.js';

export const createBranch = async (req, res, next) => {
  try {
    const branch = await branchService.createBranch(req.validatedBody, req.user._id);

    // Audit Log
    await logAudit({
      actor: req.user._id,
      action: 'CREATE_BRANCH',
      entityType: 'Branch',
      entityId: branch._id,
      branchId: branch._id,
      metadata: { newBranch: branch },
      req
    });

    return sendSuccess(res, 'Branch created successfully', { branch }, 201);
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.message, err.statusCode);
    }
    next(err);
  }
};

export const getAllBranches = async (req, res, next) => {
  try {
    const branches = await branchService.getAllBranches(req.scope);
    return sendSuccess(res, 'Branches retrieved successfully', { branches });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.message, err.statusCode);
    }
    next(err);
  }
};

export const getBranchById = async (req, res, next) => {
  try {
    const branch = await branchService.getBranchById(req.params.id, req.scope);
    return sendSuccess(res, 'Branch details retrieved successfully', { branch });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.message, err.statusCode);
    }
    next(err);
  }
};

export const updateBranch = async (req, res, next) => {
  try {
    const originalBranch = await branchService.getBranchById(req.params.id, req.scope);
    const updatedBranch = await branchService.updateBranch(req.params.id, req.validatedBody, req.user._id);

    // Audit Log: Diff details
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

    return sendSuccess(res, 'Branch updated successfully', { branch: updatedBranch });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.message, err.statusCode);
    }
    next(err);
  }
};

export const updateBranchStatus = async (req, res, next) => {
  try {
    const originalBranch = await branchService.getBranchById(req.params.id, req.scope);
    const updatedBranch = await branchService.updateBranchStatus(req.params.id, req.validatedBody.status, req.user._id);

    // Audit Log
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

    return sendSuccess(res, 'Branch status updated successfully', { branch: updatedBranch });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.message, err.statusCode);
    }
    next(err);
  }
};

export const getMyBranch = async (req, res, next) => {
  try {
    if (!req.user.branchId) {
      return sendError(res, 'You are not assigned to any branch', 400);
    }
    const branch = await branchService.getBranchById(req.user.branchId, req.scope);
    return sendSuccess(res, 'Own branch retrieved successfully', { branch });
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.message, err.statusCode);
    }
    next(err);
  }
};
