/**
 * asyncHandler — Async Controller Wrapper
 *
 * Wraps an async Express route handler so that any unhandled promise rejection
 * is automatically forwarded to the global error middleware via `next(err)`.
 *
 * Only use this on controller functions whose catch block does nothing other
 * than call next(err). Controllers that perform cleanup or conditional recovery
 * inside catch should keep their own try/catch.
 *
 * Usage:
 *   export const getUser = asyncHandler(async (req, res) => {
 *     const user = await userService.getUserById(req.params.id);
 *     return sendSuccess(res, 'User retrieved', { user });
 *   });
 *
 * @param {Function} fn - Async Express route handler (req, res, next) => Promise
 * @returns {Function}  - Express-compatible middleware
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
