const mongoose = require("mongoose");

/**
 * Connects to MongoDB using the URI from environment variables.
 * Includes connection event listeners for runtime monitoring.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Connection pool settings
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000, // fail fast if MongoDB is unreachable
      socketTimeoutMS: 45000,         // close sockets after 45s of inactivity
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

    // ── Runtime connection event listeners ──
    mongoose.connection.on("error", (err) => {
      console.error(`❌ MongoDB runtime error: ${err.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB disconnected. Attempting reconnect...");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected.");
    });
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
