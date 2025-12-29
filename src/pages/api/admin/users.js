// /pages/api/admin/users.js
// Admin API endpoint to fetch all user profiles
// Returns user list with privileges and stats

import { adminDb } from "@/lib/firebaseAdmin";

export default async function handler(req, res) {
  console.log("[API /admin/users] Request received");
  
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check if adminDb is available
  if (!adminDb) {
    console.error("[API /admin/users] Firebase Admin not initialized");
    return res.status(500).json({
      error: "Firebase Admin SDK not initialized",
      details: "Check server environment variables for Firebase Admin credentials",
    });
  }

  try {
    console.log("[API /admin/users] Attempting to fetch userProfiles collection");
    const snapshot = await adminDb.collection("userProfiles").get();
    console.log("[API /admin/users] Successfully fetched", snapshot.size, "users");

    const users = snapshot.docs.map((doc) => {
      const data = doc.data();

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

      return {
        uid: doc.id,
        email: data.email || "",
        displayName: data.displayName || "",
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
              updatedAt: convertTimestamp(data.lastLocation.updatedAt),
            }
          : null,
      };
    });

    console.log("[API /admin/users] Returning", users.length, "users");
    res.status(200).json(users);
  } catch (error) {
    console.error("[/api/admin/users] Error:", error);
    console.error("[/api/admin/users] Error stack:", error.stack);
    console.error("[/api/admin/users] Error code:", error.code);
    res.status(500).json({
      error: "Internal Server Error",
      details: String(error.message),
      code: error.code,
    });
  }
}
