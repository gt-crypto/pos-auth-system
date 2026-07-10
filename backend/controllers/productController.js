import * as productService from '../services/productService.js';
import { createProductSchema, updateProductSchema } from '../validators/productValidator.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

export const createProduct = async (req, res, next) => {
  try {
    // Validate request body
    const validatedBody = createProductSchema.parse(req.body);
    const product = await productService.createProduct(validatedBody, req.scope, req.user._id, req);

    return sendSuccess(res, 'Product created successfully', { product }, 201);
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

export const getProducts = async (req, res, next) => {
  try {
    const result = await productService.getProducts(req.scope, req.query);
    return sendSuccess(res, 'Products retrieved successfully', result);
  } catch (err) {
    if (err.status) {
      return sendError(res, err.message, err.status);
    }
    next(err);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id, req.scope);
    return sendSuccess(res, 'Product details retrieved successfully', { product });
  } catch (err) {
    if (err.status) {
      return sendError(res, err.message, err.status);
    }
    next(err);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const validatedBody = updateProductSchema.parse(req.body);
    const product = await productService.updateProduct(req.params.id, validatedBody, req.scope, req.user._id, req);

    return sendSuccess(res, 'Product updated successfully', { product });
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

export const updateProductStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
      return sendError(res, 'status parameter is required and must be either ACTIVE or INACTIVE', 400);
    }

    const product = await productService.updateProductStatus(req.params.id, status, req.scope, req.user._id, req);
    const msg = status === 'ACTIVE' ? 'Product restored successfully' : 'Product archived successfully';
    return sendSuccess(res, msg, { product });
  } catch (err) {
    if (err.status) {
      return sendError(res, err.message, err.status);
    }
    next(err);
  }
};
