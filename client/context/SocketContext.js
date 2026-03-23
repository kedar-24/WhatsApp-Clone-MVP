"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!user?.id) return;

    // Create the socket connection
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🔌 Socket connected:", socket.id);
      setIsConnected(true);

      // Join your personal room
      socket.emit("join", user.id);
    });

    socket.on("disconnect", () => {
      console.log("🔌 Socket disconnected");
      setIsConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      setIsConnected(false);
    });

    // Listen for online users broadcast
    socket.on("online_users", (users) => {
      setOnlineUsers(users);
    });

    // Cleanup on unmount or user change
    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [user?.id]);

  // ── Helper: send a message via socket ──
  const sendMessage = (senderId, receiverId, text) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("send_message", { senderId, receiverId, text });
    }
  };

  // ── Helper: update message status ──
  const markDelivered = (messageId, senderId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("mark_delivered", { messageId, senderId });
    }
  };

  const markSeen = (messageId, senderId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("mark_seen", { messageId, senderId });
    }
  };

  // ── Helper: emit typing indicator ──
  const emitTyping = (senderId, receiverId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("typing", { senderId, receiverId });
    }
  };

  // ── Helper: emit stop typing ──
  const emitStopTyping = (senderId, receiverId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("stop_typing", { senderId, receiverId });
    }
  };

  // ── Helper: subscribe to events ──
  const onEvent = (event, callback) => {
    socketRef.current?.on(event, callback);
  };

  // ── Helper: unsubscribe from events ──
  const offEvent = (event, callback) => {
    socketRef.current?.off(event, callback);
  };

  const isUserOnline = (userId) => onlineUsers.includes(userId);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        onlineUsers,
        isUserOnline,
        sendMessage,
        markDelivered,
        markSeen,
        emitTyping,
        emitStopTyping,
        onEvent,
        offEvent,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
