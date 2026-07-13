import * as supplierService from '../services/supplierService.js';
import { createSupplierSchema, updateSupplierSchema } from '../validators/supplierValidator.js';
import { sendSuccess } from '../utils/responseHandler.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../config/logger.js';

// .parse() throws ZodError on failure — the upgraded global errorMiddleware
// catches ZodError natively so no manual catch block is needed here.

export const createSupplier = asyncHandler(async (req, res) => {
  const validatedBody = createSupplierSchema.parse(req.body);
  const supplier = await supplierService.createSupplier(validatedBody, req.scope, req.user._id, req);
  logger.info(`Supplier '${supplier.name}' created by user: ${req.user.username}`);
  return sendSuccess(res, 'Supplier created successfully', { supplier }, 201);
});

export const getSuppliers = asyncHandler(async (req, res) => {
  const result = await supplierService.getSuppliers(req.scope, req.query);
  return sendSuccess(res, 'Suppliers retrieved successfully', result);
});

export const getActiveSuppliers = asyncHandler(async (req, res) => {
  const suppliers = await supplierService.getActiveSuppliers();
  return sendSuccess(res, 'Active suppliers retrieved successfully', { suppliers });
});

export const getSupplierById = asyncHandler(async (req, res) => {
  const result = await supplierService.getSupplierById(req.params.id, req.scope);
  return sendSuccess(res, 'Supplier details retrieved successfully', result);
});

export const updateSupplier = asyncHandler(async (req, res) => {
  const validatedBody = updateSupplierSchema.parse(req.body);
  const supplier = await supplierService.updateSupplier(req.params.id, validatedBody, req.scope, req.user._id, req);
  logger.info(`Supplier '${supplier.name}' updated by user: ${req.user.username}`);
  return sendSuccess(res, 'Supplier updated successfully', { supplier });
});

export const deleteSupplier = asyncHandler(async (req, res) => {
  const supplier = await supplierService.deleteSupplier(req.params.id, req.scope, req.user._id, req);
  logger.info(`Supplier ${req.params.id} archived by user: ${req.user.username}`);
  return sendSuccess(res, 'Supplier archived successfully', { supplier });
});

export const restoreSupplier = asyncHandler(async (req, res) => {
  const supplier = await supplierService.restoreSupplier(req.params.id, req.scope, req.user._id, req);
  logger.info(`Supplier ${req.params.id} restored by user: ${req.user.username}`);
  return sendSuccess(res, 'Supplier restored successfully', { supplier });
});
