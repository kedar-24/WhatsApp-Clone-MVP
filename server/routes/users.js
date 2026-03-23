const express = require("express");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { isValidObjectId } = require("../utils/validation");
const { sendSuccess, sendError } = require("../utils/response");

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────
// GET /api/users — All users except me (for "Add Friend" list)
// ─────────────────────────────────────────────────────────────────────
router.get("/", authMiddleware, asyncHandler(async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user.id } })
    .select("-password")
    .sort({ name: 1 })
    .lean();

  return sendSuccess(res, { users });
}));

// ─────────────────────────────────────────────────────────────────────
// GET /api/users/friends — My friends list
// ─────────────────────────────────────────────────────────────────────
router.get("/friends", authMiddleware, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate("friends", "-password")
    .lean();

  if (!user) return sendError(res, "User not found.", 404);

  return sendSuccess(res, { friends: user.friends || [] });
}));

// ─────────────────────────────────────────────────────────────────────
// POST /api/users/friends/:friendId — Send a friend request
// ─────────────────────────────────────────────────────────────────────
router.post("/friends/:friendId", authMiddleware, asyncHandler(async (req, res) => {
  const { friendId } = req.params;
  const userId = req.user.id;

  if (!isValidObjectId(friendId)) return sendError(res, "Invalid friend ID.", 400);
  if (userId === friendId) return sendError(res, "Cannot add yourself as a friend.", 400);

  const friend = await User.findById(friendId);
  if (!friend) return sendError(res, "User not found.", 404);

  await User.findByIdAndUpdate(friendId, {
    $addToSet: { friendRequests: userId },
  });

  return sendSuccess(res, { message: `Friend request sent to ${friend.name}.` });
}));

// ─────────────────────────────────────────────────────────────────────
// DELETE /api/users/friends/:friendId — Remove friend (mutual)
// ─────────────────────────────────────────────────────────────────────
router.delete("/friends/:friendId", authMiddleware, asyncHandler(async (req, res) => {
  const { friendId } = req.params;
  const userId = req.user.id;

  if (!isValidObjectId(friendId)) return sendError(res, "Invalid friend ID.", 400);

  // Mutual removal using Promise.all for performance
  await Promise.all([
    User.findByIdAndUpdate(userId, { $pull: { friends: friendId } }),
    User.findByIdAndUpdate(friendId, { $pull: { friends: userId } }),
  ]);

  return sendSuccess(res, { message: "Friend removed successfully." });
}));

// ─────────────────────────────────────────────────────────────────────
// GET /api/users/friend-requests — Incoming friend requests
// ─────────────────────────────────────────────────────────────────────
router.get("/friend-requests", authMiddleware, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate("friendRequests", "-password")
    .lean();

  if (!user) return sendError(res, "User not found.", 404);

  return sendSuccess(res, { requests: user.friendRequests || [] });
}));

// ─────────────────────────────────────────────────────────────────────
// POST /api/users/friend-requests/:userId/accept
// ─────────────────────────────────────────────────────────────────────
router.post("/friend-requests/:userId/accept", authMiddleware, asyncHandler(async (req, res) => {
  const currentUserId = req.user.id;
  const { userId: senderId } = req.params;

  if (!isValidObjectId(senderId)) return sendError(res, "Invalid user ID.", 400);

  await Promise.all([
    User.findByIdAndUpdate(currentUserId, {
      $addToSet: { friends: senderId },
      $pull: { friendRequests: senderId },
    }),
    User.findByIdAndUpdate(senderId, {
      $addToSet: { friends: currentUserId },
    }),
  ]);

  return sendSuccess(res, { message: "Friend request accepted." });
}));

// ─────────────────────────────────────────────────────────────────────
// POST /api/users/friend-requests/:userId/reject
// ─────────────────────────────────────────────────────────────────────
router.post("/friend-requests/:userId/reject", authMiddleware, asyncHandler(async (req, res) => {
  const currentUserId = req.user.id;
  const { userId: senderId } = req.params;

  if (!isValidObjectId(senderId)) return sendError(res, "Invalid user ID.", 400);

  await User.findByIdAndUpdate(currentUserId, {
    $pull: { friendRequests: senderId },
  });

  return sendSuccess(res, { message: "Friend request rejected." });
}));

module.exports = router;
