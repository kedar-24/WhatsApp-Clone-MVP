"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import * as messageService from "@/lib/services/messageService";
import { getUserId } from "@/lib/utils";
import { useSocket } from "@/context/SocketContext";

export function useChatMessages(user, selectedFriend, allUsers, friends) {
  const {
    sendMessage: socketSendMessage,
    markDelivered,
    markSeen,
    emitTyping,
    emitStopTyping,
    onEvent,
    offEvent,
  } = useSocket();

  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState({});
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [toasts, setToasts] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, []);

  const handleFileUpload = useCallback(async (file) => {
    if (!selectedFriend || !user || !file) return;

    const friendId = getUserId(selectedFriend);
    const tempId = Date.now();
    const isImage = file.type.startsWith("image/");

    // 1. Optimistic UI: Add temporary "Uploading..." message
    const tempMsg = {
      _id: tempId,
      senderId: user.id,
      receiverId: friendId,
      text: isImage ? "Uploading image..." : `Uploading ${file.name}...`,
      isUploading: true,
      fileType: isImage ? "image" : "file",
      fileName: file.name,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    scrollToBottom();

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await messageService.uploadFile(formData);
      const { fileUrl, fileType, fileName } = res.data;

      // 2. Remove temp message and emit socket event
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      socketSendMessage(user.id, friendId, "", fileUrl, fileType, fileName);
    } catch (err) {
      console.error("Upload failed:", err);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === tempId ? { ...m, text: "Upload failed.", isUploading: false, error: true } : m
        )
      );
    } finally {
      setIsUploading(false);
    }
  }, [selectedFriend, user, socketSendMessage, scrollToBottom]);

  const fetchConversations = useCallback(async () => {
    try {
      const convRes = await messageService.fetchConversations();
      const convs = {};
      if (convRes.data.conversations) {
        convRes.data.conversations.forEach((c) => {
          convs[c._id.toString()] = {
            unreadCount: c.unreadCount,
            latestMessage: c.latestMessage,
          };
        });
      }
      setConversations(convs);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  }, []);

  const fetchMessages = useCallback(
    async (friendId) => {
      setIsLoadingMessages(true);
      try {
        const res = await messageService.fetchMessages(friendId);
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

  const handleSendMessage = useCallback(
    (e) => {
      if (e) e.preventDefault();
      const text = newMessage.trim();
      if (!text || !selectedFriend || !user) return;

      const friendId = getUserId(selectedFriend);
      socketSendMessage(user.id, friendId, text);

      // Clear typing
      emitStopTyping(user.id, friendId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      setNewMessage("");
    },
    [newMessage, selectedFriend, user, socketSendMessage, emitStopTyping]
  );

  const handleTyping = useCallback(
    (e) => {
      setNewMessage(e.target.value);
      if (!selectedFriend || !user) return;
      const friendId = getUserId(selectedFriend);
      emitTyping(user.id, friendId);

      // Auto stop after 2s of no typing
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        emitStopTyping(user.id, friendId);
      }, 2000);
    },
    [selectedFriend, user, emitTyping, emitStopTyping]
  );

  const handleClearChat = useCallback(async (friendId) => {
    try {
      await messageService.clearChat(friendId);
      setMessages([]);
      setConversations((prev) => {
        const next = { ...prev };
        delete next[friendId];
        return next;
      });
    } catch (err) {
      console.error("Failed to clear chat:", err);
    }
  }, []);

  const onEmojiClick = useCallback((emojiObject) => {
    setNewMessage((prev) => prev + emojiObject.emoji);
  }, []);

  // ── Socket event listeners ──
  useEffect(() => {
    if (!user?.id) return;

    const handleReceiveMessage = (msg) => {
      const senderId = msg.senderId?.toString();
      const receiverId = msg.receiverId?.toString();
      const currentUserId = user?.id?.toString();
      const selectedId = selectedFriend ? getUserId(selectedFriend)?.toString() : null;

      const isCurrentConversation =
        selectedId &&
        ((senderId === selectedId && receiverId === currentUserId) ||
          (senderId === currentUserId && receiverId === selectedId));

      if (isCurrentConversation) {
        msg.status = "seen";
        markSeen(msg._id, senderId);
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
        setConversations((prev) => ({
          ...prev,
          [senderId]: { unreadCount: 0, latestMessage: msg },
        }));
      } else {
        markDelivered(msg._id, senderId);
        setConversations((prev) => {
          const prevConv = prev[senderId] || { unreadCount: 0 };
          return {
            ...prev,
            [senderId]: { unreadCount: prevConv.unreadCount + 1, latestMessage: msg },
          };
        });

        // Toast logic (re-using allUsers/friends passed from page state)
        const sender =
          allUsers.find((u) => getUserId(u)?.toString() === senderId) ||
          friends.find((f) => getUserId(f)?.toString() === senderId);

        const senderName = sender ? sender.name : "Someone";
        const toastId = Date.now();
        setToasts((prev) => [
          ...prev,
          { id: toastId, name: senderName, text: msg.text, senderId },
        ]);
        setTimeout(() => {
          setToasts((prev) =>
            prev.map((t) => (t.id === toastId ? { ...t, fading: true } : t))
          );
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== toastId));
          }, 300);
        }, 4000);

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`New message from ${senderName}`, { body: msg.text });
        }
      }
    };

    const handleMessageSent = (msg) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
      const fId = msg.receiverId?.toString();
      if (fId) {
        setConversations((prev) => {
          const prevConv = prev[fId] || { unreadCount: 0 };
          return {
            ...prev,
            [fId]: { ...prevConv, latestMessage: msg },
          };
        });
      }
    };

    const handleStatusUpdate = ({ messageId, status }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? { ...msg, status } : msg))
      );
    };

    const handleUserTyping = ({ senderId }) => {
      const selectedId = selectedFriend ? getUserId(selectedFriend)?.toString() : null;
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
  }, [user?.id, selectedFriend, onEvent, offEvent, scrollToBottom, allUsers, friends, markDelivered, markSeen]);

  return {
    messages,
    setMessages,
    conversations,
    setConversations,
    isLoadingMessages,
    typingUsers,
    setTypingUsers,
    toasts,
    newMessage,
    setNewMessage,
    messagesEndRef,
    scrollToBottom,
    fetchConversations,
    fetchMessages,
    handleSendMessage,
    handleFileUpload,
    handleTyping,
    handleClearChat,
    onEmojiClick,
    isUploading,
  };
}
