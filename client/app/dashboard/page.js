"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import api from "@/lib/api";
import EmojiPicker, { Theme } from "emoji-picker-react";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const {
    isConnected,
    isUserOnline,
    sendMessage,
    markDelivered,
    markSeen,
    emitTyping,
    emitStopTyping,
    onEvent,
    offEvent,
  } = useSocket();

  // ── State ──
  const [friends, setFriends] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [conversations, setConversations] = useState({});
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [addingFriend, setAddingFriend] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [toasts, setToasts] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);

  // Friend Requests State
  const [friendRequests, setFriendRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState(new Set());
  const [activeTab, setActiveTab] = useState("add");

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // ── Helpers ──
  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getUserId = (u) => u._id || u.id;

  // ── Scroll to bottom ──
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, []);

  // ── Fetch friends list & conversations ──
  const fetchFriends = useCallback(async () => {
    try {
      const [friendsRes, convRes, reqRes] = await Promise.all([
        api.get("/users/friends"),
        api.get("/messages/conversations/all"),
        api.get("/users/friend-requests"),
      ]);
      setFriends(friendsRes.data.friends || []);
      setFriendRequests(reqRes.data.requests || []);
      
      const convs = {};
      if (convRes.data.conversations) {
        convRes.data.conversations.forEach(c => {
          convs[c._id.toString()] = {
            unreadCount: c.unreadCount,
            latestMessage: c.latestMessage
          };
        });
      }
      setConversations(convs);
    } catch (err) {
      console.error("Failed to fetch friends or conversations:", err);
    }
  }, []);

  // ── Fetch all users (for add-friend modal) ──
  const fetchAllUsers = async () => {
    try {
      const res = await api.get("/users");
      setAllUsers(res.data.users || []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  // ── Fetch message history ──
  const fetchMessages = useCallback(
    async (friendId) => {
      setIsLoadingMessages(true);
      try {
        const res = await api.get(`/messages/${friendId}`);
        setMessages(res.data.messages || []);
        scrollToBottom();
      } catch (err) {
        console.error("Failed to fetch messages:", err);
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [scrollToBottom]
  );

  const handleSelectFriend = (friend) => {
    const fId = getUserId(friend);
    setSelectedFriend(friend);
    setMessages([]);
    setTypingUsers(new Set());
    
    // Mark all unseen messages as seen when opening chat
    setMessages((prev) => 
      prev.map(msg => {
        const isReceived = (msg.senderId?._id || msg.senderId)?.toString() === fId;
        if (isReceived && msg.status !== "seen") {
          markSeen(msg._id, fId);
          return { ...msg, status: "seen" };
        }
        return msg;
      })
    );

    // Clear unread count for this friend locally
    setConversations(prev => {
      const current = prev[fId];
      if (current && current.unreadCount > 0) {
        return { ...prev, [fId]: { ...current, unreadCount: 0 }};
      }
      return prev;
    });

    fetchMessages(fId);
  };

  // ── Send message ──
  const handleSendMessage = (e) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || !selectedFriend) return;

    const friendId = getUserId(selectedFriend);
    sendMessage(user?.id, friendId, text);

    // Clear typing
    emitStopTyping(user?.id, friendId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    setNewMessage("");
    setShowEmojiPicker(false);
  };

  // ── Emoji Click handler ──
  const onEmojiClick = (emojiObject) => {
    setNewMessage((prev) => prev + emojiObject.emoji);
  };

  // ── Clear Chat ──
  const handleClearChat = async () => {
    if (!selectedFriend) return;
    try {
      const friendId = getUserId(selectedFriend);
      await api.delete(`/messages/${friendId}`);
      setMessages([]);
      setConversations((prev) => {
        const next = { ...prev };
        delete next[friendId];
        return next;
      });
      setShowChatMenu(false);
    } catch (err) {
      console.error("Failed to clear chat:", err);
    }
  };

  // ── Remove Friend ──
  const handleRemoveFriend = async () => {
    if (!selectedFriend) return;
    try {
      const friendId = getUserId(selectedFriend);
      await api.delete(`/users/friends/${friendId}`);
      // Clear chat automatically on remove
      await api.delete(`/messages/${friendId}`);
      setSelectedFriend(null);
      setMessages([]);
      setConversations((prev) => {
        const next = { ...prev };
        delete next[friendId];
        return next;
      });
      fetchFriends();
      setShowChatMenu(false);
    } catch (err) {
      console.error("Failed to remove friend:", err);
    }
  };

  // ── Typing handler ──
  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!selectedFriend) return;
    const friendId = getUserId(selectedFriend);

    emitTyping(user?.id, friendId);

    // Auto stop after 2s of no typing
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping(user?.id, friendId);
    }, 2000);
  };

  // ── Add friend request ──
  const handleAddFriend = async (friendId) => {
    setAddingFriend(friendId);
    try {
      await api.post(`/users/friends/${friendId}`);
      setSentRequests(prev => new Set(prev).add(friendId?.toString()));
    } catch (err) {
      console.error("Failed to add friend:", err);
    } finally {
      setAddingFriend(null);
    }
  };

  // ── Accept Request ──
  const handleAcceptRequest = async (requestId) => {
    try {
      await api.post(`/users/friend-requests/${requestId}/accept`);
      setFriendRequests((prev) => prev.filter((r) => r._id !== requestId));
      fetchFriends(); // Refresh friends list
    } catch (err) {
      console.error("Failed to accept request:", err);
    }
  };

  // ── Reject Request ──
  const handleRejectRequest = async (requestId) => {
    try {
      await api.post(`/users/friend-requests/${requestId}/reject`);
      setFriendRequests((prev) => prev.filter((r) => r._id !== requestId));
    } catch (err) {
      console.error("Failed to reject request:", err);
    }
  };

  // ── Load friends on mount ──
  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  // ── Socket event listeners ──
  useEffect(() => {
    if (!user?.id) return;

    // Receive new message
    const handleReceiveMessage = (msg) => {
      const senderId = msg.senderId?.toString();
      const receiverId = msg.receiverId?.toString();
      const currentUserId = user?.id?.toString();
      // Ensure status is handled
      const selectedId = selectedFriend
        ? getUserId(selectedFriend)?.toString()
        : null;

      // Only add to chat if it belongs to the current conversation
      const isCurrentConversation =
        selectedId &&
        ((senderId === selectedId && receiverId === currentUserId) ||
          (senderId === currentUserId && receiverId === selectedId));

      if (isCurrentConversation) {
        msg.status = "seen";
        markSeen(msg._id, senderId);
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
        
        // Update conversation summary
        setConversations(prev => ({
          ...prev,
          [senderId]: { unreadCount: 0, latestMessage: msg }
        }));
      } else {
        // Not in current chat: mark delivered, show toast
        markDelivered(msg._id, senderId);
        
        // Update conversation summary with unread count
        setConversations(prev => {
          const prevConv = prev[senderId] || { unreadCount: 0 };
          return {
            ...prev,
            [senderId]: { unreadCount: prevConv.unreadCount + 1, latestMessage: msg }
          };
        });
        
        // Find sender name from friends/users
        const sender = allUsers.find(u => getUserId(u)?.toString() === senderId) 
                      || friends.find(f => getUserId(f)?.toString() === senderId);
        
        const senderName = sender ? sender.name : "Someone";
        
        // Show Toast Notification
        const toastId = Date.now();
        setToasts(prev => [...prev, { id: toastId, name: senderName, text: msg.text, senderId }]);
        setTimeout(() => {
          setToasts(prev => prev.map(t => t.id === toastId ? { ...t, fading: true } : t));
          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== toastId));
          }, 300);
        }, 4000);
        
        // Native Browser Notification (if allowed)
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`New message from ${senderName}`, { body: msg.text });
        }
      }
    };

    // Message sent acknowledgment
    const handleMessageSent = (msg) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
      
      const fId = msg.receiverId?.toString();
      if (fId) {
        setConversations(prev => {
          const prevConv = prev[fId] || { unreadCount: 0 };
          return {
            ...prev,
            [fId]: { ...prevConv, latestMessage: msg }
          };
        });
      }
    };

    // Status updates for ticks
    const handleStatusUpdate = ({ messageId, status }) => {
      setMessages((prev) => 
        prev.map(msg => msg._id === messageId ? { ...msg, status } : msg)
      );
    };

    // Typing indicators
    const handleUserTyping = ({ senderId }) => {
      const selectedId = selectedFriend
        ? getUserId(selectedFriend)?.toString()
        : null;
      if (senderId === selectedId) {
        setTypingUsers((prev) => new Set(prev).add(senderId));
        scrollToBottom();
      }
    };

    const handleUserStoppedTyping = ({ senderId }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(senderId);
        return next;
      });
    };

    onEvent("receive_message", handleReceiveMessage);
    onEvent("message_sent", handleMessageSent);
    onEvent("message_status_update", handleStatusUpdate);
    onEvent("user_typing", handleUserTyping);
    onEvent("user_stopped_typing", handleUserStoppedTyping);

    return () => {
      offEvent("receive_message", handleReceiveMessage);
      offEvent("message_sent", handleMessageSent);
      offEvent("message_status_update", handleStatusUpdate);
      offEvent("user_typing", handleUserTyping);
      offEvent("user_stopped_typing", handleUserStoppedTyping);
    };
  }, [user?.id, selectedFriend, onEvent, offEvent, scrollToBottom, allUsers, friends]);

  // Request Notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // ── Determine if a user is already a friend ──
  const friendIds = friends.map((f) => getUserId(f)?.toString());

  return (
    <ProtectedRoute>
      <div className={`dashboard ${selectedFriend ? "mobile-active-chat" : "mobile-active-sidebar"}`}>
        {/* ═══════════════ SIDEBAR ═══════════════ */}
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
              style={{ position: 'relative' }}
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
              {friendRequests.length > 0 && <span className="notification-dot" style={{ position: 'absolute', top: '-2px', right: '-2px', width: '10px', height: '10px', background: 'var(--accent)', borderRadius: '50%'}}></span>}
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
                    ? (latestMsg.senderId?.toString() === user?.id?.toString() ? "You: " : "") + latestMsg.text 
                    : "";
                  const msgTime = latestMsg ? formatTime(latestMsg.timestamp || latestMsg.createdAt) : "";

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
                          <div className="friend-name" title={friend.name}>{friend.name}</div>
                          <div className="friend-time">{msgTime || (online && "Online")}</div>
                        </div>
                        <div className="friend-bottom-row">
                          <div className={`latest-message ${unreadCount > 0 ? "unread" : ""}`}>
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

        {/* ═══════════════ CHAT AREA ═══════════════ */}
        <main className="chat-area">
          {!selectedFriend ? (
            /* Empty state */
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
          ) : (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <button
                  className="mobile-back-btn"
                  onClick={() => setSelectedFriend(null)}
                  title="Back to chats"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                </button>
                <div
                  className={`avatar ${isUserOnline(getUserId(selectedFriend)) ? "online" : ""}`}
                >
                  {getInitials(selectedFriend.name)}
                </div>
                <div className="chat-user-info">
                  <div className="chat-user-name">{selectedFriend.name}</div>
                  <div
                    className={`chat-user-status ${isUserOnline(getUserId(selectedFriend)) ? "online" : ""}`}
                  >
                    {isUserOnline(getUserId(selectedFriend))
                      ? "Online"
                      : "Offline"}
                  </div>
                </div>
                
                <div className="chat-header-actions" style={{ position: "relative" }}>
                  <button 
                    className="chat-menu-btn" 
                    onClick={() => setShowChatMenu(!showChatMenu)}
                    title="Menu"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                      <button onClick={handleRemoveFriend} className="menu-danger-btn">
                        Remove Friend
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              {isLoadingMessages ? (
                <div className="messages-loading">
                  <div className="spinner-md" />
                  <span>Loading messages...</span>
                </div>
              ) : (
                <div className="messages-container">
                  {messages.length === 0 && (
                    <div
                      className="chat-empty animate-fade-in"
                      style={{ padding: "40px 0" }}
                    >
                      <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                        No messages yet. Say hi to {selectedFriend.name}! 👋
                      </p>
                    </div>
                  )}

                  {messages.map((msg, index) => {
                    const isSent =
                      (msg.senderId?._id || msg.senderId)?.toString() ===
                      user?.id?.toString();

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
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              ) : (
                                // Double tick (delivered or seen)
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              )}

              {/* Message Input */}
              <div className="message-input-wrapper">
                {showEmojiPicker && (
                  <div className="emoji-picker-container" onClick={(e) => e.stopPropagation()}>
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
            </>
          )}
        </main>
      </div>

      {/* ═══════════════ ADD FRIEND MODAL ═══════════════ */}
      {showAddFriendModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddFriendModal(false);
          }}
        >
          <div className="modal-card">
            <div className="modal-header">
              <h3>{activeTab === "add" ? "Find Friends" : "Friend Requests"}</h3>
              <button
                className="close-btn"
                onClick={() => setShowAddFriendModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-tabs" style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: "8px" }}>
              <button 
                onClick={() => setActiveTab("add")} 
                style={{ flex: 1, padding: "12px", background: "transparent", border: "none", color: activeTab === "add" ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", borderBottom: activeTab === "add" ? "2px solid var(--accent)" : "none", fontWeight: 500 }}>
                Find Friends
              </button>
              <button 
                onClick={() => setActiveTab("requests")} 
                style={{ flex: 1, padding: "12px", background: "transparent", border: "none", color: activeTab === "requests" ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", borderBottom: activeTab === "requests" ? "2px solid var(--accent)" : "none", position: "relative", fontWeight: 500 }}>
                Requests
                {friendRequests.length > 0 && <span className="unread-badge" style={{ position: "absolute", top: "4px", right: "20%" }}>{friendRequests.length}</span>}
              </button>
            </div>

            <div className="modal-body" style={{ minHeight: "300px" }}>
              {activeTab === "add" ? (
                allUsers.length === 0 ? (
                  <div
                    className="empty-state"
                    style={{ padding: "30px", textAlign: "center" }}
                  >
                    <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                      No other users found. Share the app link so others can sign
                      up!
                    </p>
                  </div>
                ) : (
                  allUsers.map((u) => {
                    const uId = getUserId(u);
                    const isFriend = friendIds.includes(uId?.toString());
                    const hasSent = sentRequests.has(uId?.toString());

                    return (
                      <div key={uId} className="user-item">
                        <div className="avatar">{getInitials(u.name)}</div>
                        <div className="user-detail">
                          <div className="name">{u.name}</div>
                          <div className="email">{u.email}</div>
                        </div>
                        {isFriend ? (
                          <span className="added-badge">✓ Friend</span>
                        ) : hasSent ? (
                          <span className="added-badge">✓ Sent</span>
                        ) : (
                          <button
                            className="add-btn"
                            onClick={() => handleAddFriend(uId)}
                            disabled={addingFriend === uId}
                          >
                            {addingFriend === uId ? "Sending..." : "Request"}
                          </button>
                        )}
                      </div>
                    );
                  })
                )
              ) : (
                friendRequests.length === 0 ? (
                  <div className="empty-state" style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                    <p>No pending friend requests.</p>
                  </div>
                ) : (
                  friendRequests.map(r => (
                    <div key={r._id} className="user-item">
                      <div className="avatar">{getInitials(r.name)}</div>
                      <div className="user-detail">
                        <div className="name">{r.name}</div>
                        <div className="email">{r.email}</div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button 
                          className="add-btn" 
                          onClick={() => handleAcceptRequest(r._id)} 
                          style={{ padding: "6px 12px" }}>
                          Accept
                        </button>
                        <button 
                          className="close-btn" 
                          onClick={() => handleRejectRequest(r._id)} 
                          style={{ padding: "6px 12px", background: "var(--bg-hover)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      )}
      {/* ═══════════════ TOAST NOTIFICATIONS ═══════════════ */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`toast ${toast.fading ? 'fade-out' : ''}`}
            onClick={() => {
              const friend = allUsers.find(u => getUserId(u)?.toString() === toast.senderId) 
                         || friends.find(f => getUserId(f)?.toString() === toast.senderId);
              if (friend) handleSelectFriend(friend);
              setToasts(prev => prev.filter(t => t.id !== toast.id));
            }}
          >
            <div className="toast-avatar">{getInitials(toast.name)}</div>
            <div className="toast-content">
              <div className="toast-title">{toast.name}</div>
              <div className="toast-message">{toast.text}</div>
            </div>
          </div>
        ))}
      </div>
    </ProtectedRoute>
  );
}
