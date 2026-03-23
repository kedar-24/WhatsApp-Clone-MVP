const mongoose = require("mongoose");

/**
 * Validates a string is a valid MongoDB ObjectId.
 * Shared across routes and socket handlers — single source of truth.
 */
const isValidObjectId = (id) =>
  typeof id === "string" && mongoose.Types.ObjectId.isValid(id);

module.exports = { isValidObjectId };
