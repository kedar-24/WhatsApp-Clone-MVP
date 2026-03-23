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
// Add a user to the logged-in user's friends list (mutual)
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

    // Add friend to both users (mutual friendship) using $addToSet to avoid duplicates
    await User.findByIdAndUpdate(userId, {
      $addToSet: { friends: friendId },
    });
    await User.findByIdAndUpdate(friendId, {
      $addToSet: { friends: userId },
    });

    return res.status(200).json({
      success: true,
      message: `${friend.name} added as a friend.`,
    });
  } catch (error) {
    console.error("Add friend error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

module.exports = router;
