import logger from '../config/logger.js';
import { sendError } from '../utils/responseHandler.js';

export const errorHandler = (err, req, res, next) => {
  logger.error(`Error details: ${err.message}`, { stack: err.stack });

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    return sendError(res, message, 400);
  }

  // Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    return sendError(res, message, 400);
  }

  // Default server error
  return sendError(
    res,
    process.env.NODE_ENV === 'production' 
      ? 'An internal server error occurred' 
      : err.message,
    500
  );
};
