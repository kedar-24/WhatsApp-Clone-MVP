"use client";

import React from "react";
import { getInitials, getUserId, formatTime } from "@/lib/utils";

export default function Sidebar({
  user,
  logout,
  isConnected,
  isUserOnline,
  friends,
  conversations,
  selectedFriend,
  handleSelectFriend,
  searchQuery,
  setSearchQuery,
  setShowAddFriendModal,
  setActiveTab,
  fetchAllUsers,
  fetchFriends,
  friendRequests,
  setShowChatMenu,
}) {
  return (
    <aside className="sidebar" onClick={() => setShowChatMenu(false)}>
      {/* Header */}
      <div className="sidebar-header">
        <h2>
          <span className="accent-dot" />
          Chats
        </h2>
        <button
          className="add-friend-btn"
          onClick={() => {
            setShowAddFriendModal(true);
            setActiveTab("add");
            fetchAllUsers();
            fetchFriends();
          }}
          title="Add Friend"
          id="add-friend-btn"
          style={{ position: "relative" }}
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
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          {friendRequests.length > 0 && (
            <span
              className="notification-dot"
              style={{
                position: "absolute",
                top: "-2px",
                right: "-2px",
                width: "10px",
                height: "10px",
                background: "var(--accent)",
                borderRadius: "50%",
              }}
            ></span>
          )}
        </button>
      </div>

      {/* Connection Status */}
      <div
        className={`connection-status ${isConnected ? "connected" : "disconnected"}`}
      >
        <span className="status-dot" />
        {isConnected ? "Connected" : "Reconnecting..."}
      </div>

      {/* Current User */}
      <div className="sidebar-user">
        <div className="avatar">{getInitials(user?.name)}</div>
        <div className="user-info">
          <div className="user-name">{user?.name}</div>
          <div className="user-email">{user?.email}</div>
        </div>
        <button className="logout-btn" onClick={logout} id="logout-btn">
          Logout
        </button>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <div className="search-wrapper">
          <svg
            className="search-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="search-input"
          />
        </div>
      </div>

      {/* Friends List */}
      <div className="friends-list">
        {friends.length === 0 ? (
          <div className="empty-state animate-fade-in">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p>
              No friends yet.
              <br />
              Click the{" "}
              <strong
                style={{ color: "var(--accent)", cursor: "pointer" }}
                onClick={() => {
                  setShowAddFriendModal(true);
                  fetchAllUsers();
                }}
              >
                + button
              </strong>{" "}
              above to add friends!
            </p>
          </div>
        ) : (
          friends
            .filter((f) =>
              f.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((friend) => {
              const fId = getUserId(friend);
              const online = isUserOnline(fId);
              const isSelected =
                selectedFriend && getUserId(selectedFriend) === fId;

              const conv = conversations[fId];
              const unreadCount = conv?.unreadCount || 0;
              const latestMsg = conv?.latestMessage;
              const msgText = latestMsg
                ? (latestMsg.senderId?.toString() === user?.id?.toString()
                    ? "You: "
                    : "") + latestMsg.text
                : "";
              const msgTime = latestMsg
                ? formatTime(latestMsg.timestamp || latestMsg.createdAt)
                : "";

              return (
                <div
                  key={fId}
                  className={`friend-item animate-slide-in ${isSelected ? "active" : ""}`}
                  onClick={() => handleSelectFriend(friend)}
                >
                  <div className={`avatar ${online ? "online" : ""}`}>
                    {getInitials(friend.name)}
                  </div>
                  <div className="friend-info">
                    <div className="friend-name-row">
                      <div className="friend-name" title={friend.name}>
                        {friend.name}
                      </div>
                      <div className="friend-time">
                        {msgTime || (online && "Online")}
                      </div>
                    </div>
                    <div className="friend-bottom-row">
                      <div
                        className={`latest-message ${unreadCount > 0 ? "unread" : ""}`}
                      >
                        {msgText || (online ? "Online" : "Offline")}
                      </div>
                      {unreadCount > 0 && (
                        <div className="unread-badge">{unreadCount}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
        )}
      </div>
    </aside>
  );
}
