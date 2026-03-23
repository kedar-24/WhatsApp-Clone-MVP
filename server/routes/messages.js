const express = require("express");
const mongoose = require("mongoose");
const Message = require("../models/Message");
const authMiddleware = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { isValidObjectId } = require("../utils/validation");
const { sendSuccess, sendError } = require("../utils/response");

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────
// GET /api/messages/conversations/all
// Conversation summaries: latest message & unread count per friend
// ─────────────────────────────────────────────────────────────────────
router.get("/conversations/all", authMiddleware, asyncHandler(async (req, res) => {
  const currentUserId = new mongoose.Types.ObjectId(req.user.id);

  const conversations = await Message.aggregate([
    {
      $match: {
        $or: [{ senderId: currentUserId }, { receiverId: currentUserId }],
      },
    },
    { $sort: { timestamp: -1 } },
    {
      $group: {
        _id: {
          $cond: [{ $eq: ["$senderId", currentUserId] }, "$receiverId", "$senderId"],
        },
        latestMessage: { $first: "$$ROOT" },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$receiverId", currentUserId] },
                  { $ne: ["$status", "seen"] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  return sendSuccess(res, { conversations });
}));

// ─────────────────────────────────────────────────────────────────────
// GET /api/messages/:userId — Chat history (paginated)
// ─────────────────────────────────────────────────────────────────────
router.get("/:userId", authMiddleware, asyncHandler(async (req, res) => {
  const currentUserId = req.user.id;
  const otherUserId = req.params.userId;

  if (!isValidObjectId(otherUserId)) return sendError(res, "Invalid user ID format.", 400);
  if (currentUserId === otherUserId) return sendError(res, "Cannot fetch messages with yourself.", 400);

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const skip = (page - 1) * limit;

  const filter = {
    $or: [
      { senderId: currentUserId, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: currentUserId },
    ],
  };

  const [messages, total] = await Promise.all([
    Message.find(filter).sort({ timestamp: 1 }).skip(skip).limit(limit).lean(),
    Message.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    messages,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}));

// ─────────────────────────────────────────────────────────────────────
// DELETE /api/messages/:userId — Clear chat history
// ─────────────────────────────────────────────────────────────────────
router.delete("/:userId", authMiddleware, asyncHandler(async (req, res) => {
  const currentUserId = req.user.id;
  const otherUserId = req.params.userId;

  if (!isValidObjectId(otherUserId)) return sendError(res, "Invalid user ID format.", 400);

  const filter = {
    $or: [
      { senderId: currentUserId, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: currentUserId },
    ],
  };

  const result = await Message.deleteMany(filter);

  return sendSuccess(res, {
    message: "Chat history cleared.",
    deletedCount: result.deletedCount,
  });
}));

module.exports = router;
