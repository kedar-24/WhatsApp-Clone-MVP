const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender ID is required"],
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Receiver ID is required"],
    },
    text: {
      type: String,
      required: false,
      trim: true,
      maxlength: [5000, "Message cannot exceed 5000 characters"],
    },
    fileUrl: {
      type: String,
      default: null,
    },
    fileType: {
      type: String,
      enum: ["image", "file", null],
      default: null,
    },
    fileName: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },
  },
  {
    timestamps: true, // createdAt & updatedAt alongside the explicit timestamp field
  }
);

// Index for efficient chat-history queries between two users
messageSchema.index({ senderId: 1, receiverId: 1, timestamp: -1 });

// Index for efficiently finding unread messages for a user
messageSchema.index({ receiverId: 1, status: 1 });

module.exports = mongoose.model("Message", messageSchema);
