import * as categoryService from '../services/categoryService.js';
import { createCategorySchema, updateCategorySchema } from '../validators/categoryValidator.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../config/logger.js';

// .parse() throws ZodError on failure — the upgraded global errorMiddleware
// catches ZodError natively so no manual catch block is needed here.

export const createCategory = asyncHandler(async (req, res) => {
  const validatedBody = createCategorySchema.parse(req.body);
  const category = await categoryService.createCategory(validatedBody, req.scope, req.user._id, req);
  logger.info(`Category '${category.name}' created by user: ${req.user.username}`);
  return sendSuccess(res, 'Category created successfully', { category }, 201);
});

export const getCategories = asyncHandler(async (req, res) => {
  const result = await categoryService.getCategories(req.scope, req.query);
  return sendSuccess(res, 'Categories retrieved successfully', result);
});

export const getCategoryById = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryById(req.params.id, req.scope);
  return sendSuccess(res, 'Category details retrieved successfully', { category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const validatedBody = updateCategorySchema.parse(req.body);
  const category = await categoryService.updateCategory(req.params.id, validatedBody, req.scope, req.user._id, req);
  logger.info(`Category '${category.name}' updated by user: ${req.user.username}`);
  return sendSuccess(res, 'Category updated successfully', { category });
});

export const updateCategoryStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  if (isActive === undefined || typeof isActive !== 'boolean') {
    return sendError(res, 'isActive boolean parameter is required', 400);
  }

  const category = await categoryService.updateCategoryStatus(req.params.id, isActive, req.scope, req.user._id, req);
  const msg = isActive ? 'Category restored successfully' : 'Category archived successfully';
  logger.info(`Category '${category.name}' status set to isActive=${isActive} by user: ${req.user.username}`);
  return sendSuccess(res, msg, { category });
});
