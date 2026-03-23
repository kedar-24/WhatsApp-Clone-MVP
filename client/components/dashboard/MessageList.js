"use client";

import React from "react";
import { formatTime, getUserId } from "@/lib/utils";

export default function MessageList({
  isLoadingMessages,
  messages,
  selectedFriend,
  user,
  messagesEndRef,
  typingUsers,
}) {
  if (isLoadingMessages) {
    return (
      <div className="messages-loading">
        <div className="spinner-md" />
        <span>Loading messages...</span>
      </div>
    );
  }

  const currentUserId = user?.id?.toString();

  return (
    <div className="messages-container">
      {messages.length === 0 && (
        <div className="chat-empty animate-fade-in" style={{ padding: "40px 0" }}>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            No messages yet. Say hi to {selectedFriend.name}! 👋
          </p>
        </div>
      )}

      {messages.map((msg, index) => {
        const isSent =
          (msg.senderId?._id || msg.senderId)?.toString() === currentUserId;

        return (
          <div
            key={msg._id || index}
            className={`message-bubble ${isSent ? "sent" : "received"}`}
          >
            <div className="message-text">{msg.text}</div>
            <div className="message-meta">
              <span className="message-time">
                {formatTime(msg.timestamp || msg.createdAt)}
              </span>
              {/* Ticks for sent messages */}
              {isSent && (
                <span className={`message-tick ${msg.status === "seen" ? "seen" : ""}`}>
                  {msg.status === "sent" ? (
                    // Single tick
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    // Double tick (delivered or seen)
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="18 6 7 17 2 12"></polyline>
                      <polyline points="22 10 16 16"></polyline>
                    </svg>
                  )}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* Typing indicator bubble */}
      {typingUsers.size > 0 && (
        <div className="typing-bubble">
          <div className="dot" />
          <div className="dot" />
          <div className="dot" />
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
