import api from "@/lib/api";

/**
 * Centralized API service for user-related operations.
 * Single source of truth for all user endpoints.
 * Adding a new user endpoint = add a function here, no component changes needed.
 */

export const fetchAllUsers = () => api.get("/users");

export const fetchFriends = () => api.get("/users/friends");

export const sendFriendRequest = (friendId) => api.post(`/users/friends/${friendId}`);

export const removeFriend = (friendId) => api.delete(`/users/friends/${friendId}`);

export const fetchFriendRequests = () => api.get("/users/friend-requests");

export const acceptFriendRequest = (userId) => api.post(`/users/friend-requests/${userId}/accept`);

export const rejectFriendRequest = (userId) => api.post(`/users/friend-requests/${userId}/reject`);
