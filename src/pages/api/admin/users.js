// /pages/api/admin/users.js
// Admin API endpoint to fetch all user profiles
// Returns user list with privileges and stats

import admin, { adminDb } from "@/lib/firebaseAdmin";

export default async function handler(req, res) {
  console.log("[API /admin/users] Request received");
  
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check if adminDb is available
    if (!adminDb) {
      console.error("[API /admin/users] Admin DB not initialized");
      return res.status(503).json({ 
        error: "Database not configured",
        details: "Firebase Admin SDK not properly initialized"
      });
    }

    console.log("[API /admin/users] Attempting to fetch userProfiles collection");
    
    // Try to list all collections first to debug
    try {
      const collections = await adminDb.listCollections();
      console.log("[API /admin/users] Available collections:", collections.map(c => c.id));
    } catch (listError) {
      console.log("[API /admin/users] Could not list collections:", listError.message);
    }
    
    // Try to get the collection with error handling
    let snapshot;
    try {
      const collectionRef = adminDb.collection("userProfiles");
      console.log("[API /admin/users] Collection reference created");
      snapshot = await collectionRef.get();
      console.log("[API /admin/users] Query executed, snapshot size:", snapshot.size);
      console.log("[API /admin/users] Snapshot empty?", snapshot.empty);
    } catch (firestoreError) {
      console.error("[API /admin/users] Firestore query error:", firestoreError.message);
      console.error("[API /admin/users] Error code:", firestoreError.code);
      console.error("[API /admin/users] Full error:", JSON.stringify(firestoreError, null, 2));
      
      // If database doesn't exist, return empty array instead of error
      if (firestoreError.code === 5 || firestoreError.message?.includes('NOT_FOUND')) {
        console.log("[API /admin/users] Database or collection not found, returning empty array");
        return res.status(200).json([]);
      }
      
      throw firestoreError;
    }
    
    console.log("[API /admin/users] Successfully fetched", snapshot.size, "users from Firestore");

    // Fetch user data from Firebase Auth and merge with Firestore data
    const users = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const uid = doc.id;
        
        // Fetch user from Firebase Auth to get email, displayName, photoURL
        let authUser = null;
        try {
          authUser = await admin.auth().getUser(uid);
          console.log("[API /admin/users] Auth data for", uid, ":", {
            email: authUser.email,
            displayName: authUser.displayName,
            hasPhoto: !!authUser.photoURL,
          });
        } catch (authError) {
          console.error("[API /admin/users] Failed to fetch auth data for", uid, ":", authError.message);
        }

        // Convert Firestore Timestamps to ISO strings
        const convertTimestamp = (timestamp) => {
          if (!timestamp) return null;
          try {
            if (timestamp.toDate) {
              return timestamp.toDate().toISOString();
            }
            if (timestamp instanceof Date) {
              return timestamp.toISOString();
            }
            if (timestamp._seconds) {
              return new Date(timestamp._seconds * 1000).toISOString();
            }
          } catch (error) {
            console.error("Error converting timestamp:", error);
          }
          return null;
        };

        const user = {
          uid: uid,
          email: authUser?.email || data.email || "",
          displayName: authUser?.displayName || data.displayName || "",
          photoURL: authUser?.photoURL || data.photoURL || null,
          privileges: {
            tier: data.privileges?.tier || "Basic",
          },
          stats: {
            lastLoginAt: convertTimestamp(data.stats?.lastLoginAt),
            lastLoginAtRaw: data.stats?.lastLoginAt?._seconds
              ? data.stats.lastLoginAt._seconds * 1000
              : null,
            totalOnlineSeconds: data.stats?.totalOnlineSeconds || 0,
          },
          lastLocation: data.lastLocation
            ? {
                lat: data.lastLocation.lat,
                lon: data.lastLocation.lon,
                city: data.lastLocation.city || null,
                state: data.lastLocation.state || null,
                county: data.lastLocation.county || null,
                updatedAt: convertTimestamp(data.lastLocation.updatedAt),
              }
            : null,
        };
        
        // Log user data for debugging
        console.log("[API /admin/users] User:", user.email, {
          hasPhoto: !!user.photoURL,
          hasLocation: !!user.lastLocation,
          locationData: user.lastLocation ? `${user.lastLocation.city}, ${user.lastLocation.state}` : 'none'
        });
        
        return user;
      })
    );

    console.log("[API /admin/users] Returning", users.length, "users");
    res.status(200).json(users);
  } catch (error) {
    console.error("[/api/admin/users] Error:", error);
    console.error("[/api/admin/users] Error stack:", error.stack);
    console.error("[/api/admin/users] Error code:", error.code);
    
    // Handle Firestore NOT_FOUND error specifically
    if (error.code === 5 || error.message?.includes('NOT_FOUND')) {
      return res.status(500).json({
        error: "Firestore Database Not Found",
        details: "The Firestore database or collection does not exist. Please ensure Firestore is enabled in your Firebase project and the 'userProfiles' collection exists.",
        code: error.code,
        suggestion: "Create at least one user profile by logging in, or check your Firebase project settings."
      });
    }
    
    res.status(500).json({
      error: "Internal Server Error",
      details: String(error.message),
      code: error.code,
    });
  }
}
