import * as ingredientService from '../services/ingredientService.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import {
  createIngredientSchema,
  updateIngredientSchema,
  restockIngredientSchema,
  adjustIngredientSchema,
  transferIngredientSchema
} from '../validators/ingredientValidator.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../config/logger.js';

export const createIngredient = asyncHandler(async (req, res) => {
  const parse = createIngredientSchema.safeParse(req.body);
  if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);

  const ingredient = await ingredientService.createIngredient(parse.data, req.scope, req.user._id, req);
  logger.info(`Ingredient '${ingredient.name}' created by user: ${req.user.username}`);
  return sendSuccess(res, 'Ingredient created successfully.', { ingredient }, 201);
});

export const getIngredients = asyncHandler(async (req, res) => {
  const result = await ingredientService.getIngredients(req.scope, req.query);
  return sendSuccess(res, 'Ingredients retrieved.', result);
});

export const getIngredientById = asyncHandler(async (req, res) => {
  const ingredient = await ingredientService.getIngredientById(req.params.id, req.scope);
  return sendSuccess(res, 'Ingredient details retrieved.', { ingredient });
});

export const updateIngredient = asyncHandler(async (req, res) => {
  const parse = updateIngredientSchema.safeParse(req.body);
  if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);

  const ingredient = await ingredientService.updateIngredient(req.params.id, parse.data, req.scope, req.user._id, req);
  logger.info(`Ingredient '${ingredient.name}' updated by user: ${req.user.username}`);
  return sendSuccess(res, 'Ingredient updated successfully.', { ingredient });
});

export const archiveIngredient = asyncHandler(async (req, res) => {
  const ingredient = await ingredientService.archiveIngredient(req.params.id, req.scope, req.user._id, req);
  logger.info(`Ingredient ${req.params.id} archived by user: ${req.user.username}`);
  return sendSuccess(res, 'Ingredient archived successfully.', { ingredient });
});

export const restoreIngredient = asyncHandler(async (req, res) => {
  const ingredient = await ingredientService.restoreIngredient(req.params.id, req.scope, req.user._id, req);
  logger.info(`Ingredient ${req.params.id} restored by user: ${req.user.username}`);
  return sendSuccess(res, 'Ingredient restored successfully.', { ingredient });
});

export const restockIngredient = asyncHandler(async (req, res) => {
  const parse = restockIngredientSchema.safeParse(req.body);
  if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);

  const ingredient = await ingredientService.restockIngredient(parse.data, req.scope, req.user._id, req);
  logger.info(`Ingredient '${ingredient.name}' restocked by user: ${req.user.username}`);
  return sendSuccess(res, 'Ingredient restocked successfully.', { ingredient });
});

export const adjustIngredient = asyncHandler(async (req, res) => {
  const parse = adjustIngredientSchema.safeParse(req.body);
  if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);

  const ingredient = await ingredientService.adjustIngredient(parse.data, req.scope, req.user._id, req);
  logger.info(`Ingredient '${ingredient.name}' stock adjusted by user: ${req.user.username}`);
  return sendSuccess(res, 'Ingredient adjusted successfully.', { ingredient });
});

export const transferIngredient = asyncHandler(async (req, res) => {
  const parse = transferIngredientSchema.safeParse(req.body);
  if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);

  const result = await ingredientService.transferIngredient(parse.data, req.scope, req.user._id, req);
  logger.info(`Ingredient transfer completed by user: ${req.user.username}`);
  return sendSuccess(res, 'Ingredient transfer completed successfully.', result);
});

export const getIngredientHistory = asyncHandler(async (req, res) => {
  const result = await ingredientService.getIngredientHistory(req.scope, req.query);
  return sendSuccess(res, 'Ingredient history retrieved.', result);
});

export const getLowStockIngredients = asyncHandler(async (req, res) => {
  const ingredients = await ingredientService.getLowStockIngredients(req.scope);
  return sendSuccess(res, 'Low stock ingredients retrieved.', { ingredients });
});

export const getIngredientMetrics = asyncHandler(async (req, res) => {
  const metrics = await ingredientService.getIngredientMetrics(req.scope);
  return sendSuccess(res, 'Ingredient metrics retrieved.', { metrics });
});

// ---------- Stock Update (Module 12) ----------

export const updateStock = asyncHandler(async (req, res) => {
  const { operation, quantity, reason, supplierId, invoiceNumber } = req.body;
  const { id: ingredientId } = req.params;

  if (!reason) return sendError(res, 'Reason is required', 400);
  if (quantity === undefined || quantity < 0) return sendError(res, 'A valid non-negative quantity is required', 400);

  const ingredientDetails = await ingredientService.getIngredientById(ingredientId, req.scope);

  if (operation === 'increase') {
    const updated = await ingredientService.restockIngredient(
      { ingredientId, quantity, reason, invoiceNumber, supplierId },
      req.scope, req.user._id, req
    );
    logger.info(`Ingredient ${ingredientId} stock increased by user: ${req.user.username}`);
    return sendSuccess(res, 'Stock increased successfully', { ingredient: updated });
  }

  if (operation === 'decrease') {
    const newQuantity = Math.max(0, ingredientDetails.quantity - quantity);
    const updated = await ingredientService.adjustIngredient(
      { ingredientId, quantity: newQuantity, reason },
      req.scope, req.user._id, req
    );
    logger.info(`Ingredient ${ingredientId} stock decreased by user: ${req.user.username}`);
    return sendSuccess(res, 'Stock decreased successfully', { ingredient: updated });
  }

  if (operation === 'adjust') {
    const updated = await ingredientService.adjustIngredient(
      { ingredientId, quantity, reason },
      req.scope, req.user._id, req
    );
    logger.info(`Ingredient ${ingredientId} stock adjusted by user: ${req.user.username}`);
    return sendSuccess(res, 'Stock adjusted successfully', { ingredient: updated });
  }

  return sendError(res, 'Invalid operation. Supported: increase, decrease, adjust', 400);
});

export const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['ACTIVE', 'INACTIVE'].includes(status)) {
    return sendError(res, 'Invalid status. Supported: ACTIVE, INACTIVE', 400);
  }

  if (status === 'INACTIVE') {
    const ingredient = await ingredientService.archiveIngredient(req.params.id, req.scope, req.user._id, req);
    logger.info(`Ingredient ${req.params.id} set to INACTIVE by user: ${req.user.username}`);
    return sendSuccess(res, 'Ingredient archived successfully.', { ingredient });
  }

  const ingredient = await ingredientService.restoreIngredient(req.params.id, req.scope, req.user._id, req);
  logger.info(`Ingredient ${req.params.id} set to ACTIVE by user: ${req.user.username}`);
  return sendSuccess(res, 'Ingredient restored successfully.', { ingredient });
});
