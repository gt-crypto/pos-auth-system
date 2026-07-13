import * as productService from '../services/productService.js';
import { createProductSchema, updateProductSchema } from '../validators/productValidator.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../config/logger.js';

// .parse() throws ZodError on failure — the upgraded global errorMiddleware
// catches ZodError natively so no manual catch block is needed here.

export const createProduct = asyncHandler(async (req, res) => {
  const validatedBody = createProductSchema.parse(req.body);
  const product = await productService.createProduct(validatedBody, req.scope, req.user._id, req);
  logger.info(`Product '${product.name}' created by user: ${req.user.username}`);
  return sendSuccess(res, 'Product created successfully', { product }, 201);
});

export const getProducts = asyncHandler(async (req, res) => {
  const result = await productService.getProducts(req.scope, req.query);
  return sendSuccess(res, 'Products retrieved successfully', result);
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id, req.scope);
  return sendSuccess(res, 'Product details retrieved successfully', { product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const validatedBody = updateProductSchema.parse(req.body);
  const product = await productService.updateProduct(req.params.id, validatedBody, req.scope, req.user._id, req);
  logger.info(`Product '${product.name}' updated by user: ${req.user.username}`);
  return sendSuccess(res, 'Product updated successfully', { product });
});

export const updateProductStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
    return sendError(res, 'status must be either ACTIVE or INACTIVE', 400);
  }

  const product = await productService.updateProductStatus(req.params.id, status, req.scope, req.user._id, req);
  const msg = status === 'ACTIVE' ? 'Product restored successfully' : 'Product archived successfully';
  logger.info(`Product '${product.name}' status set to '${status}' by user: ${req.user.username}`);
  return sendSuccess(res, msg, { product });
});
