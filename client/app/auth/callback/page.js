"use client";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Sub-component that uses useSearchParams()
function CallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    const userJson = params.get("user");

    const handleAuth = async () => {
      if (token && userJson) {
        try {
          const userData = JSON.parse(decodeURIComponent(userJson));
          localStorage.setItem("token", token);
          localStorage.setItem("user", JSON.stringify(userData));
          
          // Use window.location.href for a hard refresh to ensure AuthContext re-hydrates properly from storage
          window.location.href = "/dashboard";
        } catch (err) {
          console.error("Failed to parse user data", err);
          router.push("/login?error=google_failed");
        }
      } else {
        router.push("/login?error=google_failed");
      }
    };

    handleAuth();
  }, [router, params]);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <div className="spinner-lg" style={{ margin: "0 auto 20px" }} />
        <p className="subtitle animate-pulse">Completing secure sign-in...</p>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function AuthCallback() {
  return (
    <Suspense 
      fallback={
        <div className="auth-page">
          <div className="auth-card" style={{ textAlign: "center" }}>
            <div className="spinner-lg" style={{ margin: "0 auto 20px" }} />
            <p className="subtitle animate-pulse">Signing you in with Google...</p>
          </div>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
