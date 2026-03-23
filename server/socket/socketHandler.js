const Message = require("../models/Message");
const { isValidObjectId: isValidId } = require("../utils/validation");

/**
 * Maps userId → socket.id for online-user tracking.
 * Using a Map for O(1) lookups.
 */
const onlineUsers = new Map();

/**
 * Initialises all Socket.IO event handlers.
 * @param {import("socket.io").Server} io
 */
const initializeSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`⚡ Socket connected: ${socket.id}`);

    // ── JOIN ──────────────────────────────────────────────────────
    // Client sends their userId after connecting.
    // We map it to the socket and join a private room.
    socket.on("join", async (userId) => {
      if (!isValidId(userId)) {
        return socket.emit("error_message", {
          message: "Invalid userId.",
        });
      }

      // Store userId on the socket for fast cleanup on disconnect
      socket.userId = userId;

      onlineUsers.set(userId, socket.id);
      socket.join(userId); // private room = the user's own ID

      console.log(`👤 User ${userId} is online (socket ${socket.id})`);

      // Broadcast updated online-user list to all clients
      io.emit("online_users", Array.from(onlineUsers.keys()));

      // ── AUTO-DELIVER PENDING MESSAGES ──
      try {
        const pendingMessages = await Message.find({ receiverId: userId, status: "sent" });
        if (pendingMessages.length > 0) {
          await Message.updateMany({ receiverId: userId, status: "sent" }, { status: "delivered" });
          // Notify the senders
          pendingMessages.forEach(msg => {
            io.to(msg.senderId.toString()).emit("message_status_update", { 
              messageId: msg._id, 
              status: "delivered" 
            });
          });
        }
      } catch (err) {
        console.error("Auto-deliver error:", err);
      }
    });

    // ── SEND MESSAGE ─────────────────────────────────────────────
    // data = { senderId, receiverId, text }
    socket.on("send_message", async (data) => {
      try {
        // Validate data is an object
        if (!data || typeof data !== "object") {
          return socket.emit("error_message", {
            message: "Invalid message format.",
          });
        }

        const { senderId, receiverId, text } = data;

        // Validate required fields
        if (!senderId || !receiverId || !text) {
          return socket.emit("error_message", {
            message: "senderId, receiverId, and text are required.",
          });
        }

        // Validate ObjectIds
        if (!isValidId(senderId) || !isValidId(receiverId)) {
          return socket.emit("error_message", {
            message: "Invalid senderId or receiverId.",
          });
        }

        // Validate text length
        if (typeof text !== "string" || text.trim().length === 0) {
          return socket.emit("error_message", {
            message: "Message text cannot be empty.",
          });
        }

        if (text.length > 5000) {
          return socket.emit("error_message", {
            message: "Message cannot exceed 5000 characters.",
          });
        }

        // Prevent sending to yourself
        if (senderId === receiverId) {
          return socket.emit("error_message", {
            message: "Cannot send a message to yourself.",
          });
        }

        // 1. Persist the message in MongoDB
        const message = await Message.create({
          senderId,
          receiverId,
          text: text.trim(),
          timestamp: new Date(),
        });

        const savedMessage = message.toObject();

        // 2. Emit to the receiver's private room (if they're online)
        io.to(receiverId).emit("receive_message", savedMessage);

        // 3. Acknowledge back to the sender with the saved message
        socket.emit("message_sent", savedMessage);

        console.log(
          `💬 ${senderId} → ${receiverId}: ${text.substring(0, 40)}${text.length > 40 ? "..." : ""}`
        );
      } catch (error) {
        console.error("send_message error:", error.message);
        socket.emit("error_message", {
          message: "Failed to send message.",
        });
      }
    });

    // ── MARK MESSAGES ───────────────────────────────────────────
    socket.on("mark_delivered", async ({ messageId, senderId }) => {
      try {
        if (!isValidId(messageId)) return;
        await Message.updateOne({ _id: messageId, status: "sent" }, { status: "delivered" });
        io.to(senderId).emit("message_status_update", { messageId, status: "delivered" });
      } catch (err) {
        console.error("mark_delivered error:", err);
      }
    });

    socket.on("mark_seen", async ({ messageId, senderId }) => {
      try {
        if (!isValidId(messageId)) return;
        // Allows jump from sent directly to seen
        await Message.updateOne({ _id: messageId, status: { $ne: "seen" } }, { status: "seen" });
        io.to(senderId).emit("message_status_update", { messageId, status: "seen" });
      } catch (err) {
        console.error("mark_seen error:", err);
      }
    });

    // ── TYPING INDICATORS ────────────────────────────────────────
    socket.on("typing", (data) => {
      if (data && isValidId(data.senderId) && isValidId(data.receiverId)) {
        io.to(data.receiverId).emit("user_typing", {
          senderId: data.senderId,
        });
      }
    });

    socket.on("stop_typing", (data) => {
      if (data && isValidId(data.senderId) && isValidId(data.receiverId)) {
        io.to(data.receiverId).emit("user_stopped_typing", {
          senderId: data.senderId,
        });
      }
    });

    // ── DISCONNECT ───────────────────────────────────────────────
    socket.on("disconnect", () => {
      // Use the userId stored on the socket (O(1) instead of iterating)
      const userId = socket.userId;
      if (userId && onlineUsers.get(userId) === socket.id) {
        onlineUsers.delete(userId);
        console.log(`🔌 User ${userId} went offline`);
      }

      // Broadcast updated online-user list
      io.emit("online_users", Array.from(onlineUsers.keys()));

      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = { initializeSocket, onlineUsers };
