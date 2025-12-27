// /src/pages/api/admin/users.js
// Admin API endpoint to fetch all user profiles from Firestore
// Returns user data including privileges, login stats, and location info

import { adminDb } from "@/lib/firebaseAdmin";

/**
 * Admin API handler for user management
 * GET - Returns list of all users with their profiles
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Fetch all user profiles from Firestore
    const usersSnapshot = await adminDb.collection("userProfiles").get();

    if (usersSnapshot.empty) {
      return res.status(200).json([]);
    }

    // Transform Firestore documents to API response format
    const users = [];

    usersSnapshot.forEach((doc) => {
      const data = doc.data();

      // Convert Firestore Timestamps to ISO strings and millis
      let lastLoginAt = null;
      let lastLoginAtRaw = null;

      if (data.stats?.lastLoginAt) {
        try {
          // Firestore Timestamp has toDate() method
          if (data.stats.lastLoginAt.toDate) {
            const date = data.stats.lastLoginAt.toDate();
            lastLoginAt = date.toISOString();
            lastLoginAtRaw = date.getTime();
          }
          // Handle case where it might already be a Date
          else if (data.stats.lastLoginAt instanceof Date) {
            lastLoginAt = data.stats.lastLoginAt.toISOString();
            lastLoginAtRaw = data.stats.lastLoginAt.getTime();
          }
          // Handle timestamp object with seconds
          else if (data.stats.lastLoginAt._seconds) {
            const date = new Date(data.stats.lastLoginAt._seconds * 1000);
            lastLoginAt = date.toISOString();
            lastLoginAtRaw = date.getTime();
          }
        } catch (error) {
          console.error("Error parsing lastLoginAt:", error);
        }
      }

      // Build user object for response
      const user = {
        uid: doc.id,
        email: data.email || "",
        displayName: data.displayName || "",
        privileges: {
          tier: data.privileges?.tier || "Basic",
        },
        stats: {
          lastLoginAt,
          lastLoginAtRaw,
          totalOnlineSeconds: data.stats?.totalOnlineSeconds || 0,
        },
      };

      // Include location data if available
      if (data.lastLocation) {
        user.lastLocation = {
          lat: data.lastLocation.lat,
          lon: data.lastLocation.lon,
          city: data.lastLocation.city || null,
          state: data.lastLocation.state || null,
        };

        // Include location timestamp if available
        if (data.lastLocation.updatedAt) {
          try {
            if (data.lastLocation.updatedAt.toDate) {
              user.lastLocation.updatedAt = data.lastLocation.updatedAt.toDate().toISOString();
            }
          } catch (error) {
            console.error("Error parsing location updatedAt:", error);
          }
        }
      }

      users.push(user);
    });

    // Sort by last login (most recent first)
    users.sort((a, b) => {
      if (!a.stats.lastLoginAtRaw && !b.stats.lastLoginAtRaw) return 0;
      if (!a.stats.lastLoginAtRaw) return 1;
      if (!b.stats.lastLoginAtRaw) return -1;
      return b.stats.lastLoginAtRaw - a.stats.lastLoginAtRaw;
    });

    return res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ 
      error: "Failed to fetch users",
      message: error.message 
    });
  }
}
