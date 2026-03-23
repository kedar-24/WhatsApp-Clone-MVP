/**
 * Standardized API response helpers.
 * Every route uses these instead of manually constructing response objects.
 */

const sendSuccess = (res, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    ...data,
  });
};

const sendError = (res, message = "Internal server error.", statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = { sendSuccess, sendError };
