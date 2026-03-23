"use client";

import React from "react";
import { getInitials, getUserId } from "@/lib/utils";

export default function AddFriendModal({
  setShowAddFriendModal,
  activeTab,
  setActiveTab,
  allUsers,
  friends,
  friendRequests,
  sentRequests,
  addingFriend,
  handleAddFriend,
  handleAcceptRequest,
  handleRejectRequest,
}) {
  const friendIds = friends.map((f) => getUserId(f)?.toString());

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) setShowAddFriendModal(false);
      }}
    >
      <div className="modal-content animate-slide-up">
        <div className="modal-header">
          <h3>Add Friends</h3>
          <button
            className="close-btn"
            onClick={() => setShowAddFriendModal(false)}
          >
            &times;
          </button>
        </div>

        <div className="modal-tabs">
          <button
            className={activeTab === "add" ? "active" : ""}
            onClick={() => setActiveTab("add")}
          >
            Find Users
          </button>
          <button
            className={activeTab === "requests" ? "active" : ""}
            onClick={() => setActiveTab("requests")}
          >
            Requests {friendRequests.length > 0 && `(${friendRequests.length})`}
          </button>
        </div>

        <div className="modal-body">
          {activeTab === "add" ? (
            <div className="users-to-add">
              {allUsers.length === 0 ? (
                <div className="modal-empty-state">No other users found.</div>
              ) : (
                allUsers.map((u) => {
                  const uId = getUserId(u);
                  const isFriend = friendIds.includes(uId?.toString());
                  const isSent = sentRequests.has(uId?.toString());

                  return (
                    <div key={uId} className="user-add-item">
                      <div className="avatar">{getInitials(u.name)}</div>
                      <div className="user-add-info">
                        <div className="name">{u.name}</div>
                        <div className="email">{u.email}</div>
                      </div>
                      {isFriend ? (
                        <span className="friend-badge">Friend</span>
                      ) : (
                        <button
                          className="add-btn-small"
                          onClick={() => handleAddFriend(uId)}
                          disabled={addingFriend === uId || isSent}
                        >
                          {addingFriend === uId
                            ? "Sending..."
                            : isSent
                              ? "Requested"
                              : "Add"}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="friend-requests-list">
              {friendRequests.length === 0 ? (
                <div className="modal-empty-state">No pending requests.</div>
              ) : (
                friendRequests.map((req) => (
                  <div key={req._id} className="user-add-item">
                    <div className="avatar">{getInitials(req.name)}</div>
                    <div className="user-add-info">
                      <div className="name">{req.name}</div>
                      <div className="email">{req.email}</div>
                    </div>
                    <div className="request-actions">
                      <button
                        className="accept-btn"
                        onClick={() => handleAcceptRequest(req._id)}
                      >
                        Accept
                      </button>
                      <button
                        className="reject-btn"
                        onClick={() => handleRejectRequest(req._id)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
