// /src/context/AuthContext.js
// Central authentication state + admin role check
// Updated so the app runs locally even when Firebase env vars are missing.

import { createContext, useContext, useEffect, useState, useRef } from "react";
import {
  auth,
  loginWithGoogle as firebaseLogin,
  logoutUser as firebaseLogout,
  firebaseEnabled,
} from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { 
  setLastLogin,
  setLastLogout,
  saveSessionDuration 
} from "@/lib/userProfile";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const sessionStartRef = useRef(null);

  // Handle login: record session start
  useEffect(() => {
    if (!user || !firebaseEnabled) {
      return;
    }

    // Record login timestamp and start local session timer
    const recordLogin = async () => {
      try {
        await setLastLogin(user.uid, user.email);
        sessionStartRef.current = Date.now();
      } catch (error) {
        console.error("Error recording login:", error);
      }
    };

    recordLogin();
  }, [user]);

  // Handle logout/page close: save session duration
  useEffect(() => {
    if (!user || !firebaseEnabled) {
      return;
    }

    const saveSession = async () => {
      if (sessionStartRef.current && user) {
        const elapsedSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        if (elapsedSeconds > 0) {
          try {
            await saveSessionDuration(user.uid, elapsedSeconds);
            await setLastLogout(user.uid);
          } catch (error) {
            console.error("Error saving session:", error);
          }
        }
      }
    };

    // Save on page unload
    const handleBeforeUnload = () => {
      saveSession();
    };

    // Save on page hide (mobile Safari)
    const handlePageHide = () => {
      saveSession();
    };

    // Save on visibility change (tab hidden)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveSession();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  useEffect(() => {
    // If Firebase isn't configured (e.g. local dev), skip the listener
    if (!firebaseEnabled || !auth) {
      setUser(null);
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      // If logging out, save session first
      if (user && !firebaseUser && sessionStartRef.current) {
        const elapsedSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        if (elapsedSeconds > 0) {
          try {
            await saveSessionDuration(user.uid, elapsedSeconds);
            await setLastLogout(user.uid);
          } catch (error) {
            console.error("Error saving session on logout:", error);
          }
        }
        sessionStartRef.current = null;
      }

      setUser(firebaseUser || null);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

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
          "Login is disabled in this local environment because Firebase is not configured.\n\n" +
            "The live site on RiverValleyReport.com will still work normally."
        );
        return;
      }
      return firebaseLogin();
    },
    logout: async () => {
      if (!firebaseEnabled) return;
      
      // Save session before logout
      if (sessionStartRef.current && user) {
        const elapsedSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        if (elapsedSeconds > 0) {
          try {
            await saveSessionDuration(user.uid, elapsedSeconds);
            await setLastLogout(user.uid);
          } catch (error) {
            console.error("Error saving session on manual logout:", error);
          }
        }
        sessionStartRef.current = null;
      }
      
      return firebaseLogout();
    },
  };
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
