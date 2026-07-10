import * as supplierService from '../services/supplierService.js';
import { createSupplierSchema, updateSupplierSchema } from '../validators/supplierValidator.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

export const createSupplier = async (req, res, next) => {
  try {
    const validatedBody = createSupplierSchema.parse(req.body);
    const supplier = await supplierService.createSupplier(validatedBody, req.scope, req.user._id, req);
    return sendSuccess(res, 'Supplier created successfully', { supplier }, 201);
  } catch (err) {
    if (err.name === 'ZodError') {
      const errors = err.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
      return sendError(res, 'Validation failed', 400, errors);
    }
    if (err.status) {
      return sendError(res, err.message, err.status);
    }
    next(err);
  }
};

export const getSuppliers = async (req, res, next) => {
  try {
    const result = await supplierService.getSuppliers(req.scope, req.query);
    return sendSuccess(res, 'Suppliers retrieved successfully', result);
  } catch (err) {
    if (err.status) {
      return sendError(res, err.message, err.status);
    }
    next(err);
  }
};

export const getActiveSuppliers = async (req, res, next) => {
  try {
    const suppliers = await supplierService.getActiveSuppliers();
    return sendSuccess(res, 'Active suppliers retrieved successfully', { suppliers });
  } catch (err) {
    if (err.status) {
      return sendError(res, err.message, err.status);
    }
    next(err);
  }
};

export const getSupplierById = async (req, res, next) => {
  try {
    const result = await supplierService.getSupplierById(req.params.id, req.scope);
    return sendSuccess(res, 'Supplier details retrieved successfully', result);
  } catch (err) {
    if (err.status) {
      return sendError(res, err.message, err.status);
    }
    next(err);
  }
};

export const updateSupplier = async (req, res, next) => {
  try {
    const validatedBody = updateSupplierSchema.parse(req.body);
    const supplier = await supplierService.updateSupplier(req.params.id, validatedBody, req.scope, req.user._id, req);
    return sendSuccess(res, 'Supplier updated successfully', { supplier });
  } catch (err) {
    if (err.name === 'ZodError') {
      const errors = err.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
      return sendError(res, 'Validation failed', 400, errors);
    }
    if (err.status) {
      return sendError(res, err.message, err.status);
    }
    next(err);
  }
};

export const deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await supplierService.deleteSupplier(req.params.id, req.scope, req.user._id, req);
    return sendSuccess(res, 'Supplier archived successfully', { supplier });
  } catch (err) {
    if (err.status) {
      return sendError(res, err.message, err.status);
    }
    next(err);
  }
};

export const restoreSupplier = async (req, res, next) => {
  try {
    const supplier = await supplierService.restoreSupplier(req.params.id, req.scope, req.user._id, req);
    return sendSuccess(res, 'Supplier restored successfully', { supplier });
  } catch (err) {
    if (err.status) {
      return sendError(res, err.message, err.status);
    }
    next(err);
  }
};
