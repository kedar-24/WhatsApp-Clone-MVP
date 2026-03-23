"use client";

import React from "react";
import { getInitials, getUserId } from "@/lib/utils";

export default function ChatHeader({
  selectedFriend,
  isUserOnline,
  setSelectedFriend,
  handleClearChat,
  handleRemoveFriend,
  showChatMenu,
  setShowChatMenu,
}) {
  const online = isUserOnline(getUserId(selectedFriend));

  return (
    <div className="chat-header">
      <button
        className="mobile-back-btn"
        onClick={() => setSelectedFriend(null)}
        title="Back to chats"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </button>
      <div className={`avatar ${online ? "online" : ""}`}>
        {getInitials(selectedFriend.name)}
      </div>
      <div className="chat-user-info">
        <div className="chat-user-name">{selectedFriend.name}</div>
        <div className={`chat-user-status ${online ? "online" : ""}`}>
          {online ? "Online" : "Offline"}
        </div>
      </div>

      <div className="chat-header-actions" style={{ position: "relative" }}>
        <button
          className="chat-menu-btn"
          onClick={() => setShowChatMenu(!showChatMenu)}
          title="Menu"
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
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="12" cy="5" r="1"></circle>
            <circle cx="12" cy="19" r="1"></circle>
          </svg>
        </button>
        {showChatMenu && (
          <div className="chat-menu-dropdown animate-fade-in">
            <button onClick={handleClearChat} className="menu-danger-btn">
              Clear Chat
            </button>
            <button
              onClick={handleRemoveFriend}
              className="menu-danger-btn"
            >
              Remove Friend
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
