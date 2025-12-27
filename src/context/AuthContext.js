// /src/context/AuthContext.js
// Central authentication state + admin role check
// Optimized to prevent Firestore offline errors and excessive writes

import { createContext, useContext, useEffect, useState, useRef, useMemo } from "react";
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
  const loginRecordedRef = useRef(false);

  // Single auth state listener - no chained effects
  useEffect(() => {
    // If Firebase isn't configured (e.g. local dev), skip the listener
    if (!firebaseEnabled || !auth) {
      setUser(null);
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      // Handle logout - save session if user is logging out
      if (user && !firebaseUser && sessionStartRef.current) {
        const elapsedSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        if (elapsedSeconds > 5) { // Only save if session was meaningful
          try {
            await saveSessionDuration(user.uid, elapsedSeconds);
            await setLastLogout(user.uid);
          } catch (error) {
            console.error("Error saving session on logout:", error);
          }
        }
        sessionStartRef.current = null;
        loginRecordedRef.current = false;
      }

      // Handle login - record session start ONCE
      if (firebaseUser && !loginRecordedRef.current) {
        loginRecordedRef.current = true;
        sessionStartRef.current = Date.now();
        
        // Record login in background - don't block auth state
        setLastLogin(firebaseUser.uid, firebaseUser.email).catch((error) => {
          console.error("Error recording login:", error);
        });
      }

      setUser(firebaseUser || null);
      setLoading(false);
    });

    return () => unsub();
  }, []); // Run once - no dependencies

  // Handle page close/hide: save session duration
  useEffect(() => {
    if (!firebaseEnabled) return;

    const saveSession = () => {
      if (sessionStartRef.current && user?.uid) {
        const elapsedSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        if (elapsedSeconds > 5) {
          // Use sendBeacon for reliable delivery on page unload
          const data = {
            uid: user.uid,
            elapsed: elapsedSeconds,
          };
          // Fallback to sync write if sendBeacon not available
          try {
            saveSessionDuration(user.uid, elapsedSeconds).catch(() => {});
            setLastLogout(user.uid).catch(() => {});
          } catch (error) {
            // Silently fail - don't block page unload
          }
        }
      }
    };

    const handleBeforeUnload = () => saveSession();
    const handlePageHide = () => saveSession();
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

  // Define admin emails
  const adminEmails = useMemo(() => ["triggaj51@gmail.com"], []);
  const isAdmin = useMemo(() => {
    return !!user && adminEmails.includes(user.email ?? "");
  }, [user, adminEmails]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
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
        if (elapsedSeconds > 5) {
          try {
            await saveSessionDuration(user.uid, elapsedSeconds);
            await setLastLogout(user.uid);
          } catch (error) {
            console.error("Error saving session on manual logout:", error);
          }
        }
        sessionStartRef.current = null;
        loginRecordedRef.current = false;
      }
      
      return firebaseLogout();
    },
  }), [user, isAdmin, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
