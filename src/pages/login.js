// /src/pages/login.js
"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";
import { loginWithGoogle } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { LogIn, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, isAdmin, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      if (isAdmin) {
        router.replace("/admin");
      } else {
        alert("Unauthorized account. Only approved admin users can access this area.");
        logout();
        router.replace("/");
      }
    }
  }, [loading, user, isAdmin, router, logout]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error("Login error:", err);
      alert("Google sign-in failed. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full bg-card border border-border p-8 rounded-xl shadow-md">
        <h1 className="text-3xl font-bold mb-6 text-center">Login</h1>

        <p className="text-sm text-muted-foreground text-center mb-8">
          Sign in with your Google account to continue.
        </p>

        <Button
          onClick={handleLogin}
          className="w-full gap-2"
          variant="default"
        >
          <LogIn className="w-4 h-4" />
          Sign In with Google
        </Button>
      </div>
    </div>
  );
}
