// /src/lib/firebase.js
// Firebase v9 modular SDK with Google Auth enabled
// This version is safe for local dev WITHOUT Firebase env vars
// and works the same in production (Netlify) when env vars exist.

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

// All values must be present to safely enable Firebase
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
  app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);

  provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account",
  });

  // Persist login across page reloads
  setPersistence(auth, browserLocalPersistence).catch((err) => {

  });
} else {
  console.warn(
    "[Firebase] Env vars missing. Firebase Auth is DISABLED in this environment."
  );
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
  if (!firebaseEnabled || !auth) return;
  return signOut(auth);
}

// Protect admin routes on the client
export function requireAuth(user, router) {
  if (!user) {
    router.push("/login");
  }
}
