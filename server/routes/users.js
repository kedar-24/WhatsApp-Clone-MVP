const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ─────────────────────────────────────────────────────────────────────
// GET /api/users
// Returns all users except the logged-in user (for "Add Friend" list)
// ─────────────────────────────────────────────────────────────────────
router.get("/", authMiddleware, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } })
      .select("-password")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Fetch users error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/users/friends
// Returns the logged-in user's friends list
// ─────────────────────────────────────────────────────────────────────
router.get("/friends", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("friends", "-password")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({ success: true, friends: user.friends || [] });
  } catch (error) {
    console.error("Fetch friends error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/users/friends/:friendId
// Send a friend request to a user
// ─────────────────────────────────────────────────────────────────────
router.post("/friends/:friendId", authMiddleware, async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;

    if (!isValidObjectId(friendId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid friend ID.",
      });
    }

    if (userId === friendId) {
      return res.status(400).json({
        success: false,
        message: "Cannot add yourself as a friend.",
      });
    }

    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Add current user to target user's friendRequests
    await User.findByIdAndUpdate(friendId, {
      $addToSet: { friendRequests: userId },
    });

    return res.status(200).json({
      success: true,
      message: `Friend request sent to ${friend.name}.`,
    });
  } catch (error) {
    console.error("Add friend error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// DELETE /api/users/friends/:friendId
// Remove a user from the logged-in user's friends list (mutual)
// ─────────────────────────────────────────────────────────────────────
router.delete("/friends/:friendId", authMiddleware, async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;

    if (!isValidObjectId(friendId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid friend ID.",
      });
    }

    // Remove friend from both users (mutual friendship) using $pull
    await User.findByIdAndUpdate(userId, {
      $pull: { friends: friendId },
    });
    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: userId },
    });

    return res.status(200).json({
      success: true,
      message: "Friend removed successfully.",
    });
  } catch (error) {
    console.error("Remove friend error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/users/friend-requests
// Returns the logged-in user's incoming friend requests
// ─────────────────────────────────────────────────────────────────────
router.get("/friend-requests", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("friendRequests", "-password")
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.status(200).json({ success: true, requests: user.friendRequests || [] });
  } catch (error) {
    console.error("Fetch friend requests error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/users/friend-requests/:userId/accept
// Accept a friend request
// ─────────────────────────────────────────────────────────────────────
router.post("/friend-requests/:userId/accept", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId: senderId } = req.params;

    if (!isValidObjectId(senderId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID." });
    }

    // Add to friends lists and remove from requests
    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { friends: senderId },
      $pull: { friendRequests: senderId },
    });
    await User.findByIdAndUpdate(senderId, {
      $addToSet: { friends: currentUserId },
    });

    return res.status(200).json({ success: true, message: "Friend request accepted." });
  } catch (error) {
    console.error("Accept friend request error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/users/friend-requests/:userId/reject
// Reject a friend request
// ─────────────────────────────────────────────────────────────────────
router.post("/friend-requests/:userId/reject", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId: senderId } = req.params;

    if (!isValidObjectId(senderId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID." });
    }

    // Remove from requests
    await User.findByIdAndUpdate(currentUserId, {
      $pull: { friendRequests: senderId },
    });

    return res.status(200).json({ success: true, message: "Friend request rejected." });
  } catch (error) {
    console.error("Reject friend request error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

module.exports = router;
