// ─── Load Environment Variables ─────────────────────────────────────
require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const userRoutes = require("./routes/users");
const { initializeSocket } = require("./socket/socketHandler");

// ─── Validate Required Env Variables ────────────────────────────────
const requiredEnv = ["MONGO_URI", "JWT_SECRET"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnv.join(", ")}`);
  console.error("   Please check your .env file.");
  process.exit(1);
}

// ─── Initialize Express & HTTP Server ───────────────────────────────
const app = express();
const server = http.createServer(app);

// ─── Socket.IO Setup ────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000, // disconnect after 60s of no pong
});

// ─── Middleware ──────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ─── API Routes ─────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

// ─── Health-Check Route ─────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    message: "WhatsApp Clone API is running 🚀",
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 Handler (unknown routes) ───────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found.",
  });
});

// ─── Global Error Handler ───────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("💥 Unhandled Express error:", err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error."
        : err.message,
  });
});

// ─── Initialize Socket.IO Handlers ──────────────────────────────────
initializeSocket(io);

// ─── Start Server ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();

    server.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔌 Socket.IO ready for connections`);
      console.log(`📡 API routes:`);
      console.log(`   POST /api/auth/signup`);
      console.log(`   POST /api/auth/login`);
      console.log(`   GET  /api/auth/me`);
      console.log(`   GET  /api/messages/:userId\n`);
    });

    // ── Handle EADDRINUSE (port already in use) ──
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use.`);
        console.error("   Kill the other process or change PORT in .env");
        process.exit(1);
      }
      throw err;
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
};

// ─── Graceful Shutdown ──────────────────────────────────────────────
const gracefulShutdown = (signal) => {
  console.log(`\n⚠️  ${signal} received. Shutting down gracefully...`);

  server.close(() => {
    console.log("   ✅ HTTP server closed.");

    const mongoose = require("mongoose");
    mongoose.connection.close(false).then(() => {
      console.log("   ✅ MongoDB connection closed.");
      process.exit(0);
    });
  });

  // Force-kill after 10s if graceful shutdown stalls
  setTimeout(() => {
    console.error("   ❌ Forced shutdown (timeout).");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ─── Catch Unhandled Rejections & Exceptions ────────────────────────
process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err.message);
  console.error(err.stack);
  process.exit(1);
});

startServer();
