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
)
  .replace(/\\n/g, "\n") // Replace escaped newlines
  .replace(/^"|"$/g, "") // Remove surrounding quotes if present
  .trim();

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
    const config = {
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    };
    
    // Add storage bucket if available
    if (storageBucket) {
      config.storageBucket = storageBucket;
    }
    
    admin.initializeApp(config);
    console.log("[Firebase Admin] Initialized successfully");
  } catch (error) {
    console.error("[Firebase Admin] Initialization failed:", error);
    throw error;
  }
}

// Export Firestore instance
// Try to get settings to verify connection
let db;
try {
  db = admin.firestore();
  // Set longer timeout and enable ignoreUndefinedProperties
  db.settings({
    ignoreUndefinedProperties: true,
  });
  console.log("[Firebase Admin] Firestore initialized for project:", projectId);
} catch (error) {
  console.error("[Firebase Admin] Firestore initialization error:", error);
  // Create a dummy db object that will fail gracefully
  db = null;
}

export const adminDb = db;

// Export Storage (for upload API)
export const storage = storageBucket ? admin.storage().bucket() : null;

export default admin;
