import api from "@/lib/api";

/**
 * Centralized API service for message-related operations.
 * All message endpoints live here — no hardcoded strings in components.
 */

export const fetchConversations = () => api.get("/messages/conversations/all");

export const fetchMessages = (userId, page = 1, limit = 50) =>
  api.get(`/messages/${userId}?page=${page}&limit=${limit}`);

export const clearChat = (userId) => api.delete(`/messages/${userId}`);
