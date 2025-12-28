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
  const router = useRouter();
  const sessionStartRef = useRef(null);
  const loginRecordedRef = useRef(false);

  // Handle redirect result from Google Sign-In
  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
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
          
          // User state will be set by onAuthStateChanged
        }
      })
      .catch((error) => {
        if (error.code !== 'auth/popup-closed-by-user') {
          console.error("[AuthContext] Login error:", error);
          alert("Login failed: " + error.message);
        }
      });
  }, []);

  // Single auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      // Handle logout - save session if user is logging out
      if (user && !firebaseUser && sessionStartRef.current) {
        const elapsedSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        if (elapsedSeconds > 5) {
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
        
        setLastLogin(firebaseUser.uid, firebaseUser.email).catch((error) => {
          console.error("Error recording login:", error);
        });
      }

      setUser(firebaseUser || null);
      setLoading(false);
    });

    return () => unsub();
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
    // Save session before logout
    if (sessionStartRef.current && user) {
      const elapsedSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      if (elapsedSeconds > 5) {
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
    
    // Sign out and redirect
    try {
      await signOut(auth);
      setUser(null);
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
