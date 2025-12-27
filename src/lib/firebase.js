// /src/lib/firebase.js
// Firebase v9 modular SDK with Google Auth enabled
// Validates configuration and provides helpful warnings

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if all required values are present
export const firebaseEnabled =
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.authDomain &&
  !!firebaseConfig.projectId &&
  !!firebaseConfig.storageBucket &&
  !!firebaseConfig.messagingSenderId &&
  !!firebaseConfig.appId;

let app = null;
let auth = null;
let provider = null;

if (firebaseEnabled) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);

    provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account",
    });

    // Persist login across page reloads
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.error("[Firebase] Failed to set persistence:", err);
    });
  } catch (error) {
    console.error("[Firebase] Initialization failed:", error.message);
  }
} else {
  // Non-blocking warning - Firebase is optional in development
  if (typeof window !== 'undefined') {
    console.warn(
      "[Firebase] Missing env vars. Set NEXT_PUBLIC_FIREBASE_* variables to enable authentication."
    );
  }
}

// Export these so existing imports keep working.
// In dev without Firebase, they will simply be null.
export { app, auth, provider };

// --- AUTH HELPERS ---

export async function loginWithGoogle() {
  if (!firebaseEnabled || !auth || !provider) {
    throw new Error(
      "Firebase Auth is not configured for this environment. " +
        "Set NEXT_PUBLIC_FIREBASE_* env vars to enable login."
    );
  }
  return signInWithPopup(auth, provider);
}

export async function logoutUser() {
  if (!firebaseEnabled || !auth) {
    console.warn("[Firebase] Cannot logout - Firebase not initialized");
    return;
  }
  return signOut(auth);
}

// Protect admin routes on the client
export function requireAuth(user, router) {
  if (!user) {
    router.push("/login");
  }
}
