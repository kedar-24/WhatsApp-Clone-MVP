const express = require("express");
const bcrypt = require("bcrypt");
const passport = require("passport");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { generateToken, sanitizeUser } = require("../utils/token");
const { sendSuccess, sendError } = require("../utils/response");

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────
// POST /api/auth/signup
// ─────────────────────────────────────────────────────────────────────
router.post("/signup", asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return sendError(res, "Name, email, and password are required.", 400);
  }

  if (password.length < 6) {
    return sendError(res, "Password must be at least 6 characters.", 400);
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return sendError(res, "A user with this email already exists.", 409);
  }

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name: name.trim(),
    email,
    password: hashedPassword,
  });

  const token = generateToken(user);

  return sendSuccess(res, {
    message: "User registered successfully.",
    token,
    user: sanitizeUser(user),
  }, 201);
}));

// ─────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────
router.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, "Email and password are required.", 400);
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.password) {
    return sendError(res, "Invalid email or password.", 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return sendError(res, "Invalid email or password.", 401);
  }

  const token = generateToken(user);

  return sendSuccess(res, {
    message: "Login successful.",
    token,
    user: sanitizeUser(user),
  });
}));

// ─────────────────────────────────────────────────────────────────────
// GET /api/auth/me   (protected — returns current user)
// ─────────────────────────────────────────────────────────────────────
router.get("/me", authMiddleware, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) {
    return sendError(res, "User not found.", 404);
  }

  return sendSuccess(res, { user: sanitizeUser(user) });
}));

// ─────────────────────────────────────────────────────────────────────
// GET /api/auth/google  — redirect to Google
// ─────────────────────────────────────────────────────────────────────
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

// ─────────────────────────────────────────────────────────────────────
// GET /api/auth/google/callback  — Google redirects here
// ─────────────────────────────────────────────────────────────────────
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  (req, res) => {
    // 1. Generate token and sanitize user data
    const token = generateToken(req.user);
    const user = sanitizeUser(req.user);
    const userData = encodeURIComponent(JSON.stringify(user));
    const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || "http://localhost:3000";

    // 2. Direct redirect back to the frontend dashboard with credentials
    // The AuthProvider on the frontend is already configured to catch these params
    res.redirect(`${frontendUrl}/dashboard?token=${token}&user=${userData}`);
  }
);

module.exports = router;
