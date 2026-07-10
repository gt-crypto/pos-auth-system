import * as inventoryService from '../services/inventoryService.js';
import { 
  createInventorySchema, 
  updateInventorySchema,
  restockInventorySchema,
  adjustInventorySchema,
  transferInventorySchema 
} from '../validators/inventoryValidator.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

export const createInventory = async (req, res, next) => {
  try {
    const validatedBody = createInventorySchema.parse(req.body);
    const inventory = await inventoryService.createInventory(validatedBody, req.scope, req.user._id, req);
    return sendSuccess(res, 'Inventory record created successfully', { inventory }, 201);
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

export const getInventory = async (req, res, next) => {
  try {
    const result = await inventoryService.getInventory(req.scope, req.query);
    return sendSuccess(res, 'Inventory retrieved successfully', result);
  } catch (err) {
    if (err.status) {
      return sendError(res, err.message, err.status);
    }
    next(err);
  }
};

export const getInventoryById = async (req, res, next) => {
  try {
    const result = await inventoryService.getInventoryById(req.params.id, req.scope);
    return sendSuccess(res, 'Inventory details retrieved successfully', result);
  } catch (err) {
    if (err.status) {
      return sendError(res, err.message, err.status);
    }
    next(err);
  }
};

export const updateInventory = async (req, res, next) => {
  try {
    const validatedBody = updateInventorySchema.parse(req.body);
    const inventory = await inventoryService.updateInventory(req.params.id, validatedBody, req.scope, req.user._id, req);
    return sendSuccess(res, 'Inventory updated successfully', { inventory });
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

export const restockInventory = async (req, res, next) => {
  try {
    const validatedBody = restockInventorySchema.parse(req.body);
    const inventory = await inventoryService.restockInventory(validatedBody, req.scope, req.user._id, req);
    return sendSuccess(res, 'Stock restocked successfully', { inventory });
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

export const adjustInventory = async (req, res, next) => {
  try {
    const validatedBody = adjustInventorySchema.parse(req.body);
    const inventory = await inventoryService.adjustInventory(validatedBody, req.scope, req.user._id, req);
    return sendSuccess(res, 'Inventory stock adjusted successfully', { inventory });
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

export const transferInventory = async (req, res, next) => {
  try {
    const validatedBody = transferInventorySchema.parse(req.body);
    const result = await inventoryService.transferInventory(validatedBody, req.scope, req.user._id, req);
    return sendSuccess(res, 'Inventory transfer completed successfully', result);
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

export const getInventoryHistory = async (req, res, next) => {
  try {
    const result = await inventoryService.getInventoryHistory(req.scope, req.query);
    return sendSuccess(res, 'Inventory history logs retrieved successfully', result);
  } catch (err) {
    if (err.status) {
      return sendError(res, err.message, err.status);
    }
    next(err);
  }
};

export const getLowStock = async (req, res, next) => {
  try {
    const lowStock = await inventoryService.getLowStock(req.scope);
    return sendSuccess(res, 'Low-stock items retrieved successfully', { lowStock });
  } catch (err) {
    if (err.status) {
      return sendError(res, err.message, err.status);
    }
    next(err);
  }
};

export const getDashboardMetrics = async (req, res, next) => {
  try {
    const metrics = await inventoryService.getDashboardMetrics(req.scope);
    return sendSuccess(res, 'Dashboard metrics retrieved successfully', { metrics });
  } catch (err) {
    if (err.status) {
      return sendError(res, err.message, err.status);
    }
    next(err);
  }
};
