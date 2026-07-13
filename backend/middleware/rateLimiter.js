import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/responseHandler.js';
import logger from '../config/logger.js';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 requests per windowMs for auth endpoints
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP ${req.ip} on route ${req.originalUrl}`);
    return sendError(
      res,
      'Too many auth attempts from this IP. Please try again after 15 minutes.',
      429
    );
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for reset requests
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for reset-password from IP ${req.ip}`);
    return sendError(
      res,
      'Too many password reset requests. Please try again after 15 minutes.',
      429
    );
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // limit each IP to 150 requests per windowMs
  handler: (req, res) => {
    logger.warn(`Global rate limit exceeded for IP ${req.ip} on route ${req.originalUrl}`);
    return sendError(
      res,
      'Too many requests. Please try again after 15 minutes.',
      429
    );
  },
  standardHeaders: true,
  legacyHeaders: false
});

