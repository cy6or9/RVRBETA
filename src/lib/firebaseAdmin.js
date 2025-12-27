// /src/lib/firebaseAdmin.js
// Firebase Admin SDK for server-side operations
// Supports both old and new environment variable naming conventions

import * as admin from "firebase-admin";

// Map environment variables with fallbacks for backward compatibility
const projectId =
  process.env.FIREBASE_ADMIN_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  process.env.FIREBASE_PROJECT_ID;

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
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  process.env.FIREBASE_STORAGE_BUCKET;

// Validate required credentials
if (!projectId || !clientEmail || !privateKey) {
  console.error("[Firebase Admin] Missing required environment variables:");
  console.error("  - projectId:", !!projectId);
  console.error("  - clientEmail:", !!clientEmail);
  console.error("  - privateKey:", !!privateKey);
}

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
    console.error("[Firebase Admin] Initialization failed:", error.message);
  }
}

// Export Firestore and Storage instances
export const adminDb = admin.firestore();
export const storage = storageBucket ? admin.storage().bucket() : null;
export const firestore = adminDb; // Alias for backward compatibility

export default admin;
