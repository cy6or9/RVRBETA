// /src/lib/firebaseAdmin.js
// Firebase Admin SDK for server-side operations
// Used in API routes for Firestore access

import * as admin from "firebase-admin";

// Map environment variables from Netlify
const projectId =
  process.env.FIREBASE_ADMIN_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const clientEmail =
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
  process.env.FIREBASE_CLIENT_EMAIL;

const privateKey = (
  process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
  process.env.FIREBASE_PRIVATE_KEY ||
  ""
).replace(/\\n/g, "\n");

const storageBucket =
  process.env.FIREBASE_ADMIN_STORAGE_BUCKET ||
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

// Log what we have (without exposing sensitive data)
console.log("[Firebase Admin] Config check:", {
  hasProjectId: !!projectId,
  hasClientEmail: !!clientEmail,
  hasPrivateKey: !!privateKey,
  privateKeyLength: privateKey.length,
  privateKeyStarts: privateKey.substring(0, 30),
});

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket,
    });
    console.log("[Firebase Admin] Initialized successfully");
  } catch (error) {
    console.error("[Firebase Admin] Initialization failed:", error);
    throw error;
  }
}

// Export Firestore instance
export const adminDb = admin.firestore();

// Export Storage (for upload API)
export const storage = storageBucket ? admin.storage().bucket() : null;

export default admin;
