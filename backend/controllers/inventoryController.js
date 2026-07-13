import * as inventoryService from '../services/inventoryService.js';
import {
  createInventorySchema,
  updateInventorySchema,
  restockInventorySchema,
  adjustInventorySchema,
  transferInventorySchema
} from '../validators/inventoryValidator.js';
import { sendSuccess } from '../utils/responseHandler.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../config/logger.js';

// .parse() throws ZodError on failure — the upgraded global errorMiddleware
// catches ZodError natively so no manual catch block is needed here.

export const createInventory = asyncHandler(async (req, res) => {
  const validatedBody = createInventorySchema.parse(req.body);
  const inventory = await inventoryService.createInventory(validatedBody, req.scope, req.user._id, req);
  logger.info(`Inventory record created by user: ${req.user.username}`);
  return sendSuccess(res, 'Inventory record created successfully', { inventory }, 201);
});

export const getInventory = asyncHandler(async (req, res) => {
  const result = await inventoryService.getInventory(req.scope, req.query);
  return sendSuccess(res, 'Inventory retrieved successfully', result);
});

export const getInventoryById = asyncHandler(async (req, res) => {
  const result = await inventoryService.getInventoryById(req.params.id, req.scope);
  return sendSuccess(res, 'Inventory details retrieved successfully', result);
});

export const updateInventory = asyncHandler(async (req, res) => {
  const validatedBody = updateInventorySchema.parse(req.body);
  const inventory = await inventoryService.updateInventory(req.params.id, validatedBody, req.scope, req.user._id, req);
  logger.info(`Inventory ${req.params.id} updated by user: ${req.user.username}`);
  return sendSuccess(res, 'Inventory updated successfully', { inventory });
});

export const restockInventory = asyncHandler(async (req, res) => {
  const validatedBody = restockInventorySchema.parse(req.body);
  const inventory = await inventoryService.restockInventory(validatedBody, req.scope, req.user._id, req);
  logger.info(`Inventory restocked by user: ${req.user.username}`);
  return sendSuccess(res, 'Stock restocked successfully', { inventory });
});

export const adjustInventory = asyncHandler(async (req, res) => {
  const validatedBody = adjustInventorySchema.parse(req.body);
  const inventory = await inventoryService.adjustInventory(validatedBody, req.scope, req.user._id, req);
  logger.info(`Inventory stock adjusted by user: ${req.user.username}`);
  return sendSuccess(res, 'Inventory stock adjusted successfully', { inventory });
});

export const transferInventory = asyncHandler(async (req, res) => {
  const validatedBody = transferInventorySchema.parse(req.body);
  const result = await inventoryService.transferInventory(validatedBody, req.scope, req.user._id, req);
  logger.info(`Inventory transfer completed by user: ${req.user.username}`);
  return sendSuccess(res, 'Inventory transfer completed successfully', result);
});

export const getInventoryHistory = asyncHandler(async (req, res) => {
  const result = await inventoryService.getInventoryHistory(req.scope, req.query);
  return sendSuccess(res, 'Inventory history logs retrieved successfully', result);
});

export const getLowStock = asyncHandler(async (req, res) => {
  const lowStock = await inventoryService.getLowStock(req.scope);
  return sendSuccess(res, 'Low-stock items retrieved successfully', { lowStock });
});

export const getDashboardMetrics = asyncHandler(async (req, res) => {
  const metrics = await inventoryService.getDashboardMetrics(req.scope);
  return sendSuccess(res, 'Dashboard metrics retrieved successfully', { metrics });
});
