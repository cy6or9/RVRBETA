// /src/lib/firebase.js
// Firebase v9 modular SDK with Google Auth enabled

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

// 🔐 Attach Google Client ID so Firebase Web knows which OAuth app to use
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  client_id: process.env.NEXT_PUBLIC_FIREBASE_CLIENT_ID,
  prompt: "select_account"
});

// Persist login across page reloads
setPersistence(auth, browserLocalPersistence);

// --- AUTH HELPERS ---
export async function loginWithGoogle() {
  return signInWithPopup(auth, provider);
}

export async function logoutUser() {
  return signOut(auth);
}

// Protect admin routes
export function requireAuth(user, router) {
  if (!user) {
    router.push("/login");
  }
}
