"use client";

import React from "react";
import EmojiPicker, { Theme } from "emoji-picker-react";

export default function ChatInput({
  showEmojiPicker,
  setShowEmojiPicker,
  onEmojiClick,
  handleSendMessage,
  handleFileUpload,
  isUploading,
  newMessage,
  handleTyping,
}) {
  const [showAttachmentMenu, setShowAttachmentMenu] = React.useState(false);
  const mediaInputRef = React.useRef(null);
  const docInputRef = React.useRef(null);

  const onFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
      e.target.value = null; // Reset for same file re-selection
      setShowAttachmentMenu(false);
    }
  };

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

      {showAttachmentMenu && (
        <div className="attachment-menu animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="attachment-item"
            onClick={() => mediaInputRef.current?.click()}
          >
            <div className="item-icon media">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
            </div>
            <span>Photos & Videos</span>
          </button>
          <button
            type="button"
            className="attachment-item"
            onClick={() => docInputRef.current?.click()}
          >
            <div className="item-icon doc">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
            </div>
            <span>Documents</span>
          </button>
        </div>
      )}

      <form className="message-input-bar" onSubmit={handleSendMessage}>
        <div className="input-actions">
          <button
            type="button"
            className="emoji-btn"
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowAttachmentMenu(false);
            }}
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
          <button
            type="button"
            className={`plus-btn ${showAttachmentMenu ? "active" : ""}`}
            onClick={() => {
              setShowAttachmentMenu(!showAttachmentMenu);
              setShowEmojiPicker(false);
            }}
            title="Attach file"
            disabled={isUploading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: showAttachmentMenu ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <input
            type="file"
            ref={mediaInputRef}
            onChange={onFileChange}
            style={{ display: "none" }}
            accept="image/*,video/*"
          />
          <input
            type="file"
            ref={docInputRef}
            onChange={onFileChange}
            style={{ display: "none" }}
            accept="application/pdf,.doc,.docx,.txt"
          />
        </div>
        <div className="input-container">
          <input
            type="text"
            placeholder={isUploading ? "Uploading..." : "Type a message..."}
            value={newMessage}
            onChange={handleTyping}
            id="message-input"
            autoComplete="off"
            onClick={() => {
              setShowEmojiPicker(false);
              setShowAttachmentMenu(false);
            }}
            disabled={isUploading}
          />
        </div>
        <button
          type="submit"
          className="send-btn"
          disabled={!newMessage.trim() || isUploading}
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
