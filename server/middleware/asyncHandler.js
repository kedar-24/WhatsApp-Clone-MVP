/**
 * Wraps an async route handler so thrown errors are automatically
 * forwarded to Express's error-handling middleware.
 *
 * Eliminates the need for try/catch blocks in every single route.
 *
 * Usage:  router.get("/path", asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
