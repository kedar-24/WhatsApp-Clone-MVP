"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // ── On mount: rehydrate user from localStorage / validate token ──
  useEffect(() => {
    const initAuth = async () => {
      // 1. Check if we have credentials in the URL (Fallback from broken popup bridge)
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get("token");
      const urlUser = urlParams.get("user");

      if (urlToken && urlUser) {
        try {
          const userData = JSON.parse(decodeURIComponent(urlUser));
          localStorage.setItem("token", urlToken);
          localStorage.setItem("user", JSON.stringify(userData));
          setUser(userData);
          // Clean the URL to remove sensitive data
          window.history.replaceState({}, document.title, window.location.pathname);
          setLoading(false);
          return;
        } catch (e) {
          console.error("Failed to parse user from URL:", e);
        }
      }

      // 2. Standard hydration from localStorage
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (!token) {
        setLoading(false);
        return;
      }

      // Try to rehydrate from localStorage first (fast)
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          // corrupted data — ignore
        }
      }

      // 3. Validate the token against the server
      try {
        const res = await api.get("/auth/me");
        const freshUser = res.data.user;
        setUser(freshUser);
        localStorage.setItem("user", JSON.stringify(freshUser));
      } catch {
        // Token invalid / expired
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // ── Signup ──
  const signup = async (name, email, password) => {
    const res = await api.post("/auth/signup", { name, email, password });
    const { token, user: userData } = res.data;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    router.push("/dashboard");
    return res.data;
  };

  // ── Login ──
  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const { token, user: userData } = res.data;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    router.push("/dashboard");
    return res.data;
  };

  // ── Logout ──
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/login");
  };

  // ── Helper to update auth state atomically from anywhere ──
  const setAuthData = (token, userData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, setAuthData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
