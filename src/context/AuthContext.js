// /src/context/AuthContext.js
// Central authentication state + admin role check

import { createContext, useContext, useEffect, useState } from "react";
import { auth, loginWithGoogle, logoutUser } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /**
   * ADMIN EMAILS
   * Add additional admin users here — only these emails
   * can access /admin and edit articles.
   */
  const ADMIN_WHITELIST = [
    "triggaj51@gmail.com", // <--- your admin account
  ];

  const isAdmin = user && ADMIN_WHITELIST.includes(user.email);

  const value = {
    user,
    isAdmin,
    loading,
    loginWithGoogle,
    logout: logoutUser,
  };

  // Don't render app content until Firebase loads
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading authentication...
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
