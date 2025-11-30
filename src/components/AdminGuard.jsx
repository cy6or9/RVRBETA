// /src/components/AdminGuard.jsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";

export default function AdminGuard({ children }) {
  const router = useRouter();
  const { user, isAdmin, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (!isAdmin) {
        alert("Unauthorized access. Admin privileges required.");
        logout();
        router.replace("/");
      }
    }
  }, [user, isAdmin, loading, router, logout]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Checking access...</p>
      </div>
    );
  }

  return children;
}
