// /src/context/AuthContext.js
// Central authentication state + admin role check
// Updated so the app runs locally even when Firebase env vars are missing.

import { createContext, useContext, useEffect, useState } from "react";
import {
  auth,
  loginWithGoogle as firebaseLogin,
  logoutUser as firebaseLogout,
  firebaseEnabled,
} from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Firebase isn't configured (e.g. local dev), skip the listener
    if (!firebaseEnabled || !auth) {
      setUser(null);
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Define admin emails here
  const adminEmails = ["triggaj51@gmail.com"];

  const isAdmin = !!user && adminEmails.includes(user.email ?? "");

  const value = {
    user,
    isAdmin,
    loading,
    loginWithGoogle: async () => {
      if (!firebaseEnabled) {
        alert(
          "Admin login is disabled in this local environment because Firebase is not configured.\n\n" +
            "The live site on RiverValleyReport.com will still work normally."
        );
        return;
      }
      return firebaseLogin();
    },
    logout: async () => {
      if (!firebaseEnabled) return;
      return firebaseLogout();
    },
  };
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
