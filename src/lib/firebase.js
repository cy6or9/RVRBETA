// /src/lib/firebase.js
// Firebase v9 modular SDK with Google Auth enabled
// Client-side Firebase initialization

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dummy",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dummy.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dummy",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "dummy.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abc123def456",
};

// Check if Firebase is properly configured
const firebaseEnabled =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// Initialize Firebase app (always, using dummy values if needed for build)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize services
export const auth = getAuth(app);
export const firestore = getFirestore(app);

// Google Auth provider
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: "select_account",
});

// Persist login across page reloads (only if Firebase is enabled)
if (firebaseEnabled && typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.error("[Firebase] Failed to set persistence:", err);
  });
}

// Export app and provider
export { app, provider, firebaseEnabled, getRedirectResult };

// --- AUTH HELPERS ---

export async function loginWithGoogle() {
  if (!firebaseEnabled) {
    throw new Error("Firebase Auth is not configured. Please set environment variables.");
  }
  // Use redirect instead of popup to avoid COOP errors
  await signInWithRedirect(auth, provider);
}

export async function logoutUser() {
  return signOut(auth);
}

// Protect admin routes on the client
export function requireAuth(user, router) {
  if (!user) {
    router.push("/login");
  }
}
