"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * Custom hook that encapsulates Google OAuth popup logic.
 *
 * Both login/page.js and signup/page.js call this hook:
 * const { handleGoogleAuth } = useGoogleAuth();
 */

/**
 * Normalizes an origin string for exact comparison.
 * Strips trailing slashes, converts to lowercase, and maps 127.0.0.1 to localhost.
 */
const normalizeOrigin = (origin) => {
  if (!origin) return "";
  return origin
    .toLowerCase()
    .replace(/\/$/, "")
    .replace("127.0.0.1", "localhost");
};

export function useGoogleAuth() {
  const handleGoogleAuth = useCallback((e) => {
    // Prevent any bubble or form submission
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    // Direct redirect in the main window — no more popups!
    // The backend will handle the OAuth and redirect back to /dashboard with the token.
    window.location.href = `${BACKEND_URL}/api/auth/google`;
  }, []);

  return { handleGoogleAuth };
}
