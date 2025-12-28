// /src/context/AuthContext.js
// Central authentication state + admin role check

import { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut, getRedirectResult } from "firebase/auth";
import { 
  setLastLogin,
  setLastLogout,
  saveSessionDuration,
  createUserProfile
} from "@/lib/userProfile";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redirectHandled, setRedirectHandled] = useState(false);
  const router = useRouter();
  const sessionStartRef = useRef(null);
  const loginRecordedRef = useRef(false);
  const previousUserRef = useRef(null);

  // Handle redirect result from Google Sign-In - MUST happen before any navigation
  useEffect(() => {
    console.log("[AuthContext] Checking for redirect result...");
    console.log("[AuthContext] Current auth state:", auth.currentUser?.email || "no user");
    
    // Set a flag to prevent navigation until redirect is handled
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        console.log("[AuthContext] getRedirectResult resolved:", result);
        
        if (result && result.user) {
          console.log("[AuthContext] Redirect result found, user:", result.user.email);
          
          // Create user profile if needed
          try {
            await createUserProfile(result.user.uid, {
              email: result.user.email,
              displayName: result.user.displayName,
              photoURL: result.user.photoURL,
            });
          } catch (error) {
            console.error("[AuthContext] Error creating user profile:", error);
          }
          
          // Record login
          try {
            await setLastLogin(result.user.uid, result.user.email);
          } catch (error) {
            console.error("[AuthContext] Error recording login:", error);
          }
          
          // Set session start
          sessionStartRef.current = Date.now();
          loginRecordedRef.current = true;
          
          console.log("[AuthContext] Login recorded, waiting for onAuthStateChanged...");
        } else {
          console.log("[AuthContext] No redirect result, checking current user...");
          // Check if user is already logged in from persistence
          if (auth.currentUser) {
            console.log("[AuthContext] User already logged in from persistence:", auth.currentUser.email);
          }
        }
      } catch (error) {
        console.error("[AuthContext] getRedirectResult error:", error);
        if (error.code !== 'auth/popup-closed-by-user') {
          alert("Login failed: " + error.message);
        }
      } finally {
        // Mark redirect as handled
        setRedirectHandled(true);
      }
    };
    
    handleRedirect();
  }, []);

  // Single auth state listener
  useEffect(() => {
    console.log("[AuthContext] Setting up onAuthStateChanged listener");
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("[AuthContext] Auth state changed:", firebaseUser ? firebaseUser.email : "null");
      const prevUser = previousUserRef.current;
      
      // Handle logout - save session if user is logging out
      if (prevUser && !firebaseUser && sessionStartRef.current) {
        const elapsedSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        if (elapsedSeconds > 5) {
          try {
            await saveSessionDuration(prevUser.uid, elapsedSeconds);
            await setLastLogout(prevUser.uid);
          } catch (error) {
            console.error("Error saving session on logout:", error);
          }
        }
        sessionStartRef.current = null;
        loginRecordedRef.current = false;
      }

      // Handle login - record session start ONCE
      if (firebaseUser && !loginRecordedRef.current) {
        console.log("[AuthContext] Recording new login session");
        loginRecordedRef.current = true;
        sessionStartRef.current = Date.now();
        
        // Only call setLastLogin if it wasn't already called (e.g., by popup login handler)
        // Check if the user just logged in (within last 5 seconds)
        const justLoggedIn = !prevUser || (Date.now() - (sessionStartRef.current || 0)) < 5000;
        if (!justLoggedIn) {
          setLastLogin(firebaseUser.uid, firebaseUser.email).catch((error) => {
            console.error("Error recording login:", error);
          });
        }
      }

      // Update refs and state
      previousUserRef.current = firebaseUser;
      setUser(firebaseUser || null);
      setLoading(false);
      console.log("[AuthContext] User state updated, loading:", false);
    });

    return () => {
      console.log("[AuthContext] Cleaning up auth listener");
      unsub();
    };
  }, []);

  // Handle page close/hide: save session duration
  useEffect(() => {
    const saveSession = () => {
      if (sessionStartRef.current && user?.uid) {
        const elapsedSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        if (elapsedSeconds > 5) {
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

  // Logout function
  const logout = useCallback(async () => {
    console.log("[AuthContext] Logout function called");
    // Save session before logout
    if (sessionStartRef.current && user) {
      console.log("[AuthContext] Saving session before logout");
      const elapsedSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      if (elapsedSeconds > 5) {
        try {
          await saveSessionDuration(user.uid, elapsedSeconds);
          await setLastLogout(user.uid);
          console.log("[AuthContext] Session saved successfully");
        } catch (error) {
          console.error("Error saving session on logout:", error);
        }
      }
      sessionStartRef.current = null;
      loginRecordedRef.current = false;
    }
    
    // Sign out and redirect
    try {
      console.log("[AuthContext] Calling signOut...");
      await signOut(auth);
      console.log("[AuthContext] signOut successful");
      setUser(null);
      console.log("[AuthContext] Redirecting to /login");
      router.push("/login");
    } catch (error) {
      console.error("[AuthContext] Logout failed:", error);
      alert("Logout failed: " + error.message);
    }
  }, [user, router]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    isAdmin,
    loading,
    loginWithGoogle: async () => {
      const { loginWithGoogle: login } = await import("@/lib/firebase");
      return login();
    },
    logout,
  }), [user, isAdmin, loading, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
