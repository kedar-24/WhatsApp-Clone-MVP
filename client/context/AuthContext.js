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

      // Validate the token against the server
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

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
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
