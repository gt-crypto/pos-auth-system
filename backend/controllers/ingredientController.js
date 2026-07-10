import * as ingredientService from '../services/ingredientService.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import {
  createIngredientSchema,
  updateIngredientSchema,
  restockIngredientSchema,
  adjustIngredientSchema,
  transferIngredientSchema
} from '../validators/ingredientValidator.js';

const handleErr = (res, err) => {
  if (err.status) return sendError(res, err.message, err.status);
  console.error(err);
  return sendError(res, 'Internal server error', 500);
};

export const createIngredient = async (req, res) => {
  try {
    const parse = createIngredientSchema.safeParse(req.body);
    if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);

    const ingredient = await ingredientService.createIngredient(parse.data, req.scope, req.user._id, req);
    return sendSuccess(res, 'Ingredient created successfully.', { ingredient }, 201);
  } catch (err) { return handleErr(res, err); }
};

export const getIngredients = async (req, res) => {
  try {
    const result = await ingredientService.getIngredients(req.scope, req.query);
    return sendSuccess(res, 'Ingredients retrieved.', result);
  } catch (err) { return handleErr(res, err); }
};

export const getIngredientById = async (req, res) => {
  try {
    const ingredient = await ingredientService.getIngredientById(req.params.id, req.scope);
    return sendSuccess(res, 'Ingredient details retrieved.', { ingredient });
  } catch (err) { return handleErr(res, err); }
};

export const updateIngredient = async (req, res) => {
  try {
    const parse = updateIngredientSchema.safeParse(req.body);
    if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);

    const ingredient = await ingredientService.updateIngredient(req.params.id, parse.data, req.scope, req.user._id, req);
    return sendSuccess(res, 'Ingredient updated successfully.', { ingredient });
  } catch (err) { return handleErr(res, err); }
};

export const archiveIngredient = async (req, res) => {
  try {
    const ingredient = await ingredientService.archiveIngredient(req.params.id, req.scope, req.user._id, req);
    return sendSuccess(res, 'Ingredient archived successfully.', { ingredient });
  } catch (err) { return handleErr(res, err); }
};

export const restoreIngredient = async (req, res) => {
  try {
    const ingredient = await ingredientService.restoreIngredient(req.params.id, req.scope, req.user._id, req);
    return sendSuccess(res, 'Ingredient restored successfully.', { ingredient });
  } catch (err) { return handleErr(res, err); }
};

export const restockIngredient = async (req, res) => {
  try {
    const parse = restockIngredientSchema.safeParse(req.body);
    if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);

    const ingredient = await ingredientService.restockIngredient(parse.data, req.scope, req.user._id, req);
    return sendSuccess(res, 'Ingredient restocked successfully.', { ingredient });
  } catch (err) { return handleErr(res, err); }
};

export const adjustIngredient = async (req, res) => {
  try {
    const parse = adjustIngredientSchema.safeParse(req.body);
    if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);

    const ingredient = await ingredientService.adjustIngredient(parse.data, req.scope, req.user._id, req);
    return sendSuccess(res, 'Ingredient adjusted successfully.', { ingredient });
  } catch (err) { return handleErr(res, err); }
};

export const transferIngredient = async (req, res) => {
  try {
    const parse = transferIngredientSchema.safeParse(req.body);
    if (!parse.success) return sendError(res, parse.error.errors[0].message, 422);

    const result = await ingredientService.transferIngredient(parse.data, req.scope, req.user._id, req);
    return sendSuccess(res, 'Ingredient transfer completed successfully.', result);
  } catch (err) { return handleErr(res, err); }
};

export const getIngredientHistory = async (req, res) => {
  try {
    const result = await ingredientService.getIngredientHistory(req.scope, req.query);
    return sendSuccess(res, 'Ingredient history retrieved.', result);
  } catch (err) { return handleErr(res, err); }
};

export const getLowStockIngredients = async (req, res) => {
  try {
    const ingredients = await ingredientService.getLowStockIngredients(req.scope);
    return sendSuccess(res, 'Low stock ingredients retrieved.', { ingredients });
  } catch (err) { return handleErr(res, err); }
};

export const getIngredientMetrics = async (req, res) => {
  try {
    const metrics = await ingredientService.getIngredientMetrics(req.scope);
    return sendSuccess(res, 'Ingredient metrics retrieved.', { metrics });
  } catch (err) { return handleErr(res, err); }
};

// ---------- Module 12 Patch Endpoints ----------

export const updateStock = async (req, res) => {
  try {
    const { operation, quantity, reason, supplierId, invoiceNumber } = req.body;
    const ingredientId = req.params.id;
    if (!reason) return sendError(res, 'Reason is required', 400);
    if (quantity === undefined || quantity < 0) return sendError(res, 'A valid non-negative quantity is required', 400);

    // Load ingredient to calculate new total stock if relative increment/decrement
    const ingredientDetails = await ingredientService.getIngredientById(ingredientId, req.scope);
    
    let finalQuantity = ingredientDetails.quantity;
    if (operation === 'increase') {
      const updated = await ingredientService.restockIngredient({
        ingredientId, quantity, reason, invoiceNumber, supplierId
      }, req.scope, req.user._id, req);
      return sendSuccess(res, 'Stock increased successfully', { ingredient: updated });
    } else if (operation === 'decrease') {
      finalQuantity = Math.max(0, ingredientDetails.quantity - quantity);
      const updated = await ingredientService.adjustIngredient({
        ingredientId, quantity: finalQuantity, reason
      }, req.scope, req.user._id, req);
      return sendSuccess(res, 'Stock decreased successfully', { ingredient: updated });
    } else if (operation === 'adjust') {
      const updated = await ingredientService.adjustIngredient({
        ingredientId, quantity, reason
      }, req.scope, req.user._id, req);
      return sendSuccess(res, 'Stock adjusted successfully', { ingredient: updated });
    } else {
      return sendError(res, 'Invalid operation. Supported: increase, decrease, adjust', 400);
    }
  } catch (err) { return handleErr(res, err); }
};

export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return sendError(res, 'Invalid status. Supported: ACTIVE, INACTIVE', 400);
    }
    
    if (status === 'INACTIVE') {
      const ingredient = await ingredientService.archiveIngredient(req.params.id, req.scope, req.user._id, req);
      return sendSuccess(res, 'Ingredient archived successfully.', { ingredient });
    } else {
      const ingredient = await ingredientService.restoreIngredient(req.params.id, req.scope, req.user._id, req);
      return sendSuccess(res, 'Ingredient restored successfully.', { ingredient });
    }
  } catch (err) { return handleErr(res, err); }
};
