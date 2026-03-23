const express = require("express");
const mongoose = require("mongoose");
const Message = require("../models/Message");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// ─── Helper: validate MongoDB ObjectId ──────────────────────────────
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ─────────────────────────────────────────────────────────────────────
// GET /api/messages/:userId
// Fetch chat history between the logged-in user and :userId
// Sorted by timestamp ascending (oldest → newest)
// Supports optional pagination via ?page=1&limit=50
// ─────────────────────────────────────────────────────────────────────
router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    // Validate the target userId
    if (!isValidObjectId(otherUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format.",
      });
    }

    // Prevent self-chat queries
    if (currentUserId === otherUserId) {
      return res.status(400).json({
        success: false,
        message: "Cannot fetch messages with yourself.",
      });
    }

    // Pagination defaults with bounds
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    // Build the query filter once (reused for find + count)
    const filter = {
      $or: [
        { senderId: currentUserId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: currentUserId },
      ],
    };

    // Run both queries in parallel for performance
    const [messages, total] = await Promise.all([
      Message.find(filter)
        .sort({ timestamp: 1 }) // oldest first
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    // CastError = badly-formed ObjectId that slipped through
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format.",
      });
    }

    console.error("Fetch messages error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

module.exports = router;
