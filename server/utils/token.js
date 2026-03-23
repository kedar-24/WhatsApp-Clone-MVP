const jwt = require("jsonwebtoken");

/**
 * Generate a signed JWT for a user.
 * Used by: auth routes (signup, login) and passport strategy (Google OAuth).
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

/**
 * Strip sensitive fields from user object before sending to client.
 * Never expose password, __v, or internal Mongoose fields.
 */
const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar || "",
});

module.exports = { generateToken, sanitizeUser };
