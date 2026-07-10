import * as categoryService from '../services/categoryService.js';
import { createCategorySchema, updateCategorySchema } from '../validators/categoryValidator.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

export const createCategory = async (req, res, next) => {
  try {
    // Validate request body
    const validatedBody = createCategorySchema.parse(req.body);
    const category = await categoryService.createCategory(validatedBody, req.scope, req.user._id, req);

    return sendSuccess(res, 'Category created successfully', { category }, 201);
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

export const getCategories = async (req, res, next) => {
  try {
    const result = await categoryService.getCategories(req.scope, req.query);
    return sendSuccess(res, 'Categories retrieved successfully', result);
  } catch (err) {
    if (err.status) {
      return sendError(res, err.message, err.status);
    }
    next(err);
  }
};

export const getCategoryById = async (req, res, next) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id, req.scope);
    return sendSuccess(res, 'Category details retrieved successfully', { category });
  } catch (err) {
    if (err.status) {
      return sendError(res, err.message, err.status);
    }
    next(err);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const validatedBody = updateCategorySchema.parse(req.body);
    const category = await categoryService.updateCategory(req.params.id, validatedBody, req.scope, req.user._id, req);

    return sendSuccess(res, 'Category updated successfully', { category });
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

export const updateCategoryStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (isActive === undefined || typeof isActive !== 'boolean') {
      return sendError(res, 'isActive boolean parameter is required', 400);
    }

    const category = await categoryService.updateCategoryStatus(req.params.id, isActive, req.scope, req.user._id, req);
    const msg = isActive ? 'Category restored successfully' : 'Category archived successfully';
    return sendSuccess(res, msg, { category });
  } catch (err) {
    if (err.status) {
      return sendError(res, err.message, err.status);
    }
    next(err);
  }
};
