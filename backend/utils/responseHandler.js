/**
 * Standard Success Response Handler
 */
export const sendSuccess = (res, message, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Standard Failure Response Handler
 */
export const sendError = (res, message, statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    message
  });
};
