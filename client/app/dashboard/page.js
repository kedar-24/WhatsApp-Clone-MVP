"use client";

import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { getUserId } from "@/lib/utils";

// Components
import Sidebar from "@/components/dashboard/Sidebar";
import EmptyState from "@/components/dashboard/EmptyState";
import ChatHeader from "@/components/dashboard/ChatHeader";
import MessageList from "@/components/dashboard/MessageList";
import ChatInput from "@/components/dashboard/ChatInput";
import AddFriendModal from "@/components/dashboard/AddFriendModal";
import ToastContainer from "@/components/dashboard/ToastContainer";

// Hooks
import { useFriendManagement } from "@/hooks/useFriendManagement";
import { useChatMessages } from "@/hooks/useChatMessages";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { isConnected, isUserOnline, markSeen, onEvent, offEvent } = useSocket();

  // ── State (Orchestrated by Hooks) ──
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("add");

  // ── Hooks ──
  const {
    friends,
    setFriends,
    allUsers,
    friendRequests,
    sentRequests,
    addingFriend,
    fetchFriends,
    fetchAllUsers,
    handleAddFriend,
    handleAcceptRequest,
    handleRejectRequest,
    handleRemoveFriend,
  } = useFriendManagement();

  useEffect(() => {
    const handleStatusChange = ({ userId, isOnline, lastSeen }) => {
      setFriends((prev) =>
        prev.map((f) => {
          if (getUserId(f) === userId) {
            return { ...f, isOnline, lastSeen };
          }
          return f;
        })
      );
      setSelectedFriend((prev) => {
        if (prev && getUserId(prev) === userId) {
          return { ...prev, isOnline, lastSeen };
        }
        return prev;
      });
    };
    onEvent("user_status_change", handleStatusChange);
    return () => offEvent("user_status_change", handleStatusChange);
  }, [onEvent, offEvent, setFriends]);

  const {
    messages,
    setMessages,
    conversations,
    setConversations,
    isLoadingMessages,
    typingUsers,
    setTypingUsers,
    toasts,
    newMessage,
    messagesEndRef,
    scrollToBottom,
    fetchMessages,
    fetchConversations,
    handleSendMessage,
    handleFileUpload,
    handleTyping,
    handleClearChat,
    onEmojiClick,
    isUploading,
  } = useChatMessages(user, selectedFriend, allUsers, friends);

  // ── Helpers ──
  const handleSelectFriend = useCallback((friend) => {
    const fId = getUserId(friend);
    setSelectedFriend(friend);
    setMessages([]);
    setTypingUsers(new Set());

    // Mark all unseen messages as seen when opening chat
    setMessages((prev) =>
      prev.map((msg) => {
        const isReceived = (msg.senderId?._id || msg.senderId)?.toString() === fId;
        if (isReceived && msg.status !== "seen") {
          markSeen(msg._id, fId);
          return { ...msg, status: "seen" };
        }
        return msg;
      })
    );

    // Clear unread count for this friend locally
    setConversations((prev) => {
      const current = prev[fId];
      if (current && current.unreadCount > 0) {
        return { ...prev, [fId]: { ...current, unreadCount: 0 } };
      }
      return prev;
    });

    fetchMessages(fId);
  }, [fetchMessages, markSeen, setConversations, setMessages, setTypingUsers]);

  // Handle Clear Chat
  const onClearChat = async () => {
    if (!selectedFriend) return;
    const friendId = getUserId(selectedFriend);
    await handleClearChat(friendId);
    setShowChatMenu(false);
  };

  // Handle Remove Friend
  const onRemoveFriend = async () => {
    if (!selectedFriend) return;
    const friendId = getUserId(selectedFriend);
    await handleRemoveFriend(friendId);
    await handleClearChat(friendId);
    setSelectedFriend(null);
    setShowChatMenu(false);
    fetchFriends(); // Refresh lists
  };

  // Initial Data Fetch
  useEffect(() => {
    fetchFriends();
    fetchConversations();
  }, [fetchFriends, fetchConversations]);

  // Request Notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return (
    <ProtectedRoute>
      <div className={`dashboard ${selectedFriend ? "mobile-active-chat" : "mobile-active-sidebar"}`}>
        <Sidebar
          user={user}
          logout={logout}
          isConnected={isConnected}
          isUserOnline={isUserOnline}
          friends={friends}
          conversations={conversations}
          selectedFriend={selectedFriend}
          handleSelectFriend={handleSelectFriend}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setShowAddFriendModal={setShowAddFriendModal}
          setActiveTab={setActiveTab}
          fetchAllUsers={fetchAllUsers}
          fetchFriends={fetchFriends}
          friendRequests={friendRequests}
          setShowChatMenu={setShowChatMenu}
        />

        <main className="chat-area">
          {!selectedFriend ? (
            <EmptyState />
          ) : (
            <>
              <ChatHeader
                selectedFriend={selectedFriend}
                isUserOnline={isUserOnline}
                setSelectedFriend={setSelectedFriend}
                handleClearChat={onClearChat}
                handleRemoveFriend={onRemoveFriend}
                showChatMenu={showChatMenu}
                setShowChatMenu={setShowChatMenu}
              />
              <MessageList
                isLoadingMessages={isLoadingMessages}
                messages={messages}
                selectedFriend={selectedFriend}
                user={user}
                messagesEndRef={messagesEndRef}
                typingUsers={typingUsers}
              />
              <ChatInput
                showEmojiPicker={showEmojiPicker}
                setShowEmojiPicker={setShowEmojiPicker}
                onEmojiClick={onEmojiClick}
                handleSendMessage={handleSendMessage}
                handleFileUpload={handleFileUpload}
                isUploading={isUploading}
                newMessage={newMessage}
                handleTyping={handleTyping}
              />
            </>
          )}
        </main>
      </div>

      {showAddFriendModal && (
        <AddFriendModal
          setShowAddFriendModal={setShowAddFriendModal}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          allUsers={allUsers}
          friends={friends}
          friendRequests={friendRequests}
          sentRequests={sentRequests}
          addingFriend={addingFriend}
          handleAddFriend={handleAddFriend}
          handleAcceptRequest={handleAcceptRequest}
          handleRejectRequest={handleRejectRequest}
        />
      )}

      <ToastContainer toasts={toasts} />
    </ProtectedRoute>
  );
}
