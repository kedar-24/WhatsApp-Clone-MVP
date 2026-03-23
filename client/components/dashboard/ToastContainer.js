"use client";

import React from "react";

export default function ToastContainer({ toasts }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toasts-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`chat-toast animate-slide-up ${toast.fading ? "fading" : ""}`}
        >
          <div className="toast-avatar">
            {toast.name?.[0].toUpperCase()}
          </div>
          <div className="toast-content">
            <div className="toast-name">{toast.name}</div>
            <div className="toast-text">{toast.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
