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
  projectId: projectId,
  hasClientEmail: !!clientEmail,
  clientEmail: clientEmail ? clientEmail.substring(0, 20) + "..." : "missing",
  hasPrivateKey: !!privateKey,
  privateKeyLength: privateKey.length,
  privateKeyStarts: privateKey.substring(0, 30),
});

// Initialize Firebase Admin SDK
let adminInitialized = false;
if (!admin.apps.length) {
  try {
    if (!projectId || !clientEmail || !privateKey) {
      const missing = [];
      if (!projectId) missing.push("projectId");
      if (!clientEmail) missing.push("clientEmail");
      if (!privateKey) missing.push("privateKey");
      throw new Error(`Missing Firebase Admin credentials: ${missing.join(", ")}`);
    }
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket,
    });
    adminInitialized = true;
    console.log("[Firebase Admin] Initialized successfully");
  } catch (error) {
    console.error("[Firebase Admin] Initialization failed:", error.message);
    console.error("[Firebase Admin] Full error:", error);
    // Don't throw - allow app to continue but adminDb will be null
  }
}

// Export Firestore instance (null if not initialized)
export const adminDb = adminInitialized || admin.apps.length ? admin.firestore() : null;

// Export Storage (for upload API)
export const storage = storageBucket ? admin.storage().bucket() : null;

export default admin;
