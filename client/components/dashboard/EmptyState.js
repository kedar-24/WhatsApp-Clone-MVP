"use client";

import React from "react";

export default function EmptyState() {
  return (
    <div className="chat-empty animate-fade-in">
      <div className="empty-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <h3>WhatsApp Clone</h3>
      <p>
        Select a conversation from the sidebar to start chatting, or add
        new friends to get started.
      </p>
    </div>
  );
}
