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
            className={`message-bubble ${isSent ? "sent" : "received"} ${msg.isUploading ? "uploading" : ""}`}
          >
            {msg.fileUrl || msg.isUploading ? (
              <div className="message-file">
                {msg.fileType === "image" ? (
                  <div className="image-container">
                    {msg.isUploading && (
                      <div className="upload-overlay">
                        <div className="spinner-sm" />
                        <span>Uploading...</span>
                      </div>
                    )}
                    <img
                      src={msg.fileUrl || ""}
                      alt={msg.fileName}
                      className="chat-image"
                      onLoad={() => messagesEndRef.current?.scrollIntoView()}
                      style={{ opacity: msg.isUploading ? 0.5 : 1 }}
                    />
                  </div>
                ) : (
                  <div className={`file-card ${msg.isUploading ? "uploading" : ""}`}>
                    <div className="file-icon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className="file-info">
                      <div className="file-name" title={msg.fileName}>
                        {msg.fileName}
                      </div>
                      <div className="file-status">
                        {msg.isUploading ? "Uploading..." : "File"}
                      </div>
                    </div>
                    {!msg.isUploading && (
                      <a
                        href={msg.fileUrl}
                        download={msg.fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="file-download"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </a>
                    )}
                  </div>
                )}
                {msg.text && <div className="message-text file-caption">{msg.text}</div>}
              </div>
            ) : (
              <div className="message-text">{msg.text}</div>
            )}
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
