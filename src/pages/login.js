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
  const { user, isAdmin, loading } = useAuth();

  useEffect(() => {
    console.log("[LoginPage] Effect running - loading:", loading, "user:", user?.email || "null", "isAdmin:", isAdmin);
    
    if (!loading && user) {
      console.log("[LoginPage] User authenticated, preparing redirect...");
      
      // Defer navigation to next frame to prevent forced reflow
      requestAnimationFrame(() => {
        const redirect = router.query.redirect;
        
        if (redirect === 'admin') {
          // User wants to access admin, check if they're admin
          if (isAdmin) {
            console.log("[LoginPage] Redirecting to admin");
            router.replace("/admin");
          } else {
            alert("Admin privileges required. Redirecting to homepage.");
            console.log("[LoginPage] Not admin, redirecting to home");
            router.replace("/");
          }
        } else {
          // Normal login - redirect to river conditions or home
          console.log("[LoginPage] Redirecting to river-conditions");
          router.replace("/river-conditions");
        }
      });
    }
  }, [loading, user, isAdmin, router]);

  const handleLogin = async () => {
    try {
      // loginWithGoogle uses redirect - user will be redirected to Google
      // After Google auth, they'll return to this app and getRedirectResult will handle it
      await loginWithGoogle();
      // Note: Code after this won't run because browser redirects to Google
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
          Sign in with your Google account to access River Valley Report.
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
