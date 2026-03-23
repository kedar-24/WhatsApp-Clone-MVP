"use client";

import { useState, useCallback, useEffect } from "react";
import * as userService from "@/lib/services/userService";
import { getUserId } from "@/lib/utils";

export function useFriendManagement() {
  const [friends, setFriends] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState(new Set());
  const [addingFriend, setAddingFriend] = useState(null);

  const fetchFriends = useCallback(async () => {
    try {
      const [friendsRes, reqRes] = await Promise.all([
        userService.fetchFriends(),
        userService.fetchFriendRequests(),
      ]);
      setFriends(friendsRes.data.friends || []);
      setFriendRequests(reqRes.data.requests || []);
    } catch (err) {
      console.error("Failed to fetch friends or requests:", err);
    }
  }, []);

  const fetchAllUsers = useCallback(async () => {
    try {
      const res = await userService.fetchAllUsers();
      setAllUsers(res.data.users || []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  }, []);

  const handleAddFriend = useCallback(async (friendId) => {
    setAddingFriend(friendId);
    try {
      await userService.sendFriendRequest(friendId);
      setSentRequests((prev) => new Set(prev).add(friendId?.toString()));
    } catch (err) {
      console.error("Failed to add friend:", err);
    } finally {
      setAddingFriend(null);
    }
  }, []);

  const handleAcceptRequest = useCallback(async (requestId) => {
    try {
      await userService.acceptFriendRequest(requestId);
      setFriendRequests((prev) => prev.filter((r) => r._id !== requestId));
      // Refresh friends list
      const res = await userService.fetchFriends();
      setFriends(res.data.friends || []);
    } catch (err) {
      console.error("Failed to accept request:", err);
    }
  }, []);

  const handleRejectRequest = useCallback(async (requestId) => {
    try {
      await userService.rejectFriendRequest(requestId);
      setFriendRequests((prev) => prev.filter((r) => r._id !== requestId));
    } catch (err) {
      console.error("Failed to reject request:", err);
    }
  }, []);

  const handleRemoveFriend = useCallback(async (friendId) => {
    try {
      await userService.removeFriend(friendId);
      setFriends((prev) => prev.filter((f) => getUserId(f) !== friendId));
    } catch (err) {
      console.error("Failed to remove friend:", err);
    }
  }, []);

  return {
    friends,
    setFriends,
    allUsers,
    friendRequests,
    setFriendRequests,
    sentRequests,
    addingFriend,
    fetchFriends,
    fetchAllUsers,
    handleAddFriend,
    handleAcceptRequest,
    handleRejectRequest,
    handleRemoveFriend,
  };
}
