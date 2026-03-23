"use client";

import React from "react";
import EmojiPicker, { Theme } from "emoji-picker-react";

export default function ChatInput({
  showEmojiPicker,
  setShowEmojiPicker,
  onEmojiClick,
  handleSendMessage,
  newMessage,
  handleTyping,
}) {
  return (
    <div className="message-input-wrapper">
      {showEmojiPicker && (
        <div
          className="emoji-picker-container"
          onClick={(e) => e.stopPropagation()}
        >
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            theme={Theme.DARK}
            autoFocusSearch={false}
          />
        </div>
      )}
      <form className="message-input-bar" onSubmit={handleSendMessage}>
        <button
          type="button"
          className="emoji-btn"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          title="Emojis"
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
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
            <line x1="9" y1="9" x2="9.01" y2="9"></line>
            <line x1="15" y1="9" x2="15.01" y2="9"></line>
          </svg>
        </button>
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={handleTyping}
          id="message-input"
          autoComplete="off"
          onClick={() => setShowEmojiPicker(false)}
        />
        <button
          type="submit"
          className="send-btn"
          disabled={!newMessage.trim()}
          id="send-btn"
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
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}
