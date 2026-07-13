import logger from '../config/logger.js';
import { sendError } from '../utils/responseHandler.js';
import AppError from '../utils/AppError.js';

/**
 * Global Error Handler Middleware
 *
 * Handles four categories of errors in priority order:
 *  1. AppError (operational) — known, intentional errors thrown by services/controllers
 *  2. ZodError              — validation schema failures from .parse()
 *  3. Mongoose errors       — CastError (bad ObjectId), ValidationError, duplicate key (11000)
 *  4. Unexpected crashes    — everything else; stack trace logged, generic message in production
 */
export const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars

  // 1. Known operational error thrown via `throw new AppError(message, statusCode)`
  if (err.isOperational) {
    logger.warn(`[${err.statusCode}] ${err.message}`);
    return sendError(res, err.message, err.statusCode);
  }

  // 2. Zod validation failure from .parse() — extract the first human-readable message
  if (err.name === 'ZodError') {
    const message = err.errors?.[0]?.message ?? 'Validation failed';
    logger.warn(`[422] ZodError: ${message}`);
    return sendError(res, message, 422);
  }

  // 3a. Mongoose CastError — invalid ObjectId passed in URL param
  if (err.name === 'CastError') {
    const message = `Invalid value for field '${err.path}'`;
    logger.warn(`[400] CastError: ${message}`);
    return sendError(res, message, 400);
  }

  // 3b. Mongoose schema validation failure
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(e => e.message).join(', ');
    logger.warn(`[400] ValidationError: ${message}`);
    return sendError(res, message, 400);
  }

  // 3c. MongoDB duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'field';
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    logger.warn(`[400] DuplicateKey: ${message}`);
    return sendError(res, message, 400);
  }

  // 4. Unexpected / programmer error — log full stack, hide details in production
  logger.error(`[500] Unexpected error: ${err.message}`, { stack: err.stack });
  return sendError(
    res,
    process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred'
      : err.message,
    500
  );
};
