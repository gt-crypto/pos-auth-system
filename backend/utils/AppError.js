/**
 * AppError — Operational Error Class
 *
 * Thrown by services and controllers for known, expected failure conditions
 * (e.g. not found, duplicate, forbidden). Distinguishes operational errors
 * from unexpected programmer errors so the global error handler can respond
 * appropriately without leaking stack traces in production.
 *
 * Usage:
 *   throw new AppError('Resource not found', 404);
 */
class AppError extends Error {
  /**
   * @param {string} message   - Human-readable error message returned to the client
   * @param {number} statusCode - HTTP status code (e.g. 400, 403, 404, 422, 500)
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // distinguishes known errors from crashes
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
