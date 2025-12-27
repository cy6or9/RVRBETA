// /src/lib/userProfile.js
// User profile management for RiverValleyReport
// Handles saved map state, cached data, favorites, and offline mode preferences

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { app, firebaseEnabled } from "./firebase";

let db = null;

if (firebaseEnabled && app) {
  db = getFirestore(app);
}

// Default user profile structure
export const defaultUserProfile = {
  // Map State
  mapPreferences: {
    defaultLocation: { lat: 38.5, lon: -84.5 }, // Center of Ohio River
    zoom: 8,
    layers: {
      waterLevels: true,
      weatherRadar: false,
      locksDams: true,
      hazardZones: true,
      traffic: false,
    },
    darkMode: false,
  },

  // Cached Data (for fast loads)
  cachedData: {
    lastSeenRiverData: null,
    lastSeenForecast: null,
    lastUpdated: null,
    preferredStations: [], // Array of station IDs
    cachedHazardReports: [],
    savedStations: [], // For quick access
  },

  // Favorites
  favorites: {
    gauges: [], // Array of gauge/station IDs
    locksDams: [], // Array of lock IDs
    towns: [], // Array of town names or IDs
    marinas: [], // Array of marina IDs
  },

  // Offline Mode
  offlineMode: {
    enabled: false,
    downloadedTiles: [],
    lastSyncedRiverData: null,
    lastSyncedForecast: null,
    localStationData: {},
  },

  // User metadata
  createdAt: null,
  updatedAt: null,
  email: "",
  displayName: "",

  // Privileges / Subscription
  privileges: {
    tier: "Basic", // "Basic" | "Plus" | "Premium"
  },

  // Login and usage stats
  stats: {
    lastLoginAt: null,
    lastLogoutAt: null,
    totalOnlineSeconds: 0,
  },

  // Last known location (when Find Me is used)
  lastLocation: null,
};

/**
 * Create a new user profile in Firestore
 * @param {string} userId - Firebase user UID
 * @param {object} initialData - Optional initial data to merge with defaults
 * @returns {Promise<object>} Created profile
 */
export async function createUserProfile(userId, initialData = {}) {
  if (!firebaseEnabled || !db) {
    return null;
  }

  try {
    const userRef = doc(db, "userProfiles", userId);
    const profile = {
      ...defaultUserProfile,
      ...initialData,
      privileges: {
        tier: "Basic", // Always default to Basic
        ...initialData.privileges,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, profile);

    return profile;
  } catch (error) {
    throw error;
  }
}

/**
 * Get user profile from Firestore
 * @param {string} userId - Firebase user UID
 * @returns {Promise<object|null>} User profile or null if not found
 */
export async function getUserProfile(userId) {
  if (!firebaseEnabled || !db) {

    return defaultUserProfile;
  }

  try {
    const userRef = doc(db, "userProfiles", userId);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // Create profile if it doesn't exist

      return await createUserProfile(userId);
    }
  } catch (error) {

    return defaultUserProfile;
  }
}

/**
 * Update user profile in Firestore
 * @param {string} userId - Firebase user UID
 * @param {object} updates - Partial profile data to update
 * @returns {Promise<void>}
 */
export async function updateUserProfile(userId, updates) {
  if (!firebaseEnabled || !db) {

    return;
  }

  try {
    const userRef = doc(db, "userProfiles", userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

  } catch (error) {

    throw error;
  }
}

/**
 * Update map preferences
 * @param {string} userId - Firebase user UID
 * @param {object} preferences - Map preferences to update
 */
export async function updateMapPreferences(userId, preferences) {
  return updateUserProfile(userId, {
    mapPreferences: preferences,
  });
}

/**
 * Update cached data
 * @param {string} userId - Firebase user UID
 * @param {object} cachedData - Cached data to update
 */
export async function updateCachedData(userId, cachedData) {
  return updateUserProfile(userId, {
    "cachedData.lastUpdated": serverTimestamp(),
    ...Object.keys(cachedData).reduce((acc, key) => {
      acc[`cachedData.${key}`] = cachedData[key];
      return acc;
    }, {}),
  });
}

/**
 * Add a favorite (lock, town, or marina)
 * @param {string} userId - Firebase user UID
 * @param {string} type - 'locksDams' | 'towns' | 'marinas'
 * @param {string} itemId - ID of the item to favorite
 */
export async function addFavorite(userId, type, itemId) {
  if (!firebaseEnabled || !db) return;

  try {
    const profile = await getUserProfile(userId);
    const currentFavorites = profile.favorites?.[type] || [];

    if (!currentFavorites.includes(itemId)) {
      currentFavorites.push(itemId);
      await updateUserProfile(userId, {
        [`favorites.${type}`]: currentFavorites,
      });
    }
  } catch (error) {

  }
}

/**
 * Remove a favorite
 * @param {string} userId - Firebase user UID
 * @param {string} type - 'locksDams' | 'towns' | 'marinas'
 * @param {string} itemId - ID of the item to unfavorite
 */
export async function removeFavorite(userId, type, itemId) {
  if (!firebaseEnabled || !db) return;

  try {
    const profile = await getUserProfile(userId);
    const currentFavorites = profile.favorites?.[type] || [];
    const filtered = currentFavorites.filter((id) => id !== itemId);

    await updateUserProfile(userId, {
      [`favorites.${type}`]: filtered,
    });
  } catch (error) {

  }
}

/**
 * Check if an item is favorited
 * @param {object} profile - User profile
 * @param {string} type - 'locksDams' | 'towns' | 'marinas'
 * @param {string} itemId - ID of the item
 * @returns {boolean}
 */
export function isFavorite(profile, type, itemId) {
  return profile?.favorites?.[type]?.includes(itemId) || false;
}

/**
 * Update offline mode settings
 * @param {string} userId - Firebase user UID
 * @param {object} offlineSettings - Offline settings to update
 */
export async function updateOfflineMode(userId, offlineSettings) {
  return updateUserProfile(userId, {
    offlineMode: offlineSettings,
  });
}

/**
 * Add a preferred station for quick access
 * @param {string} userId - Firebase user UID
 * @param {string} stationId - Station ID to add
 */
export async function addPreferredStation(userId, stationId) {
  if (!firebaseEnabled || !db) return;

  try {
    const profile = await getUserProfile(userId);
    const currentStations = profile.cachedData?.preferredStations || [];

    if (!currentStations.includes(stationId)) {
      currentStations.push(stationId);
      await updateUserProfile(userId, {
        "cachedData.preferredStations": currentStations,
      });
    }
  } catch (error) {

  }
}

/**
 * Remove a preferred station
 * @param {string} userId - Firebase user UID
 * @param {string} stationId - Station ID to remove
 */
export async function removePreferredStation(userId, stationId) {
  if (!firebaseEnabled || !db) return;

  try {
    const profile = await getUserProfile(userId);
    const currentStations = profile.cachedData?.preferredStations || [];
    const filtered = currentStations.filter((id) => id !== stationId);

    await updateUserProfile(userId, {
      "cachedData.preferredStations": filtered,
    });
  } catch (error) {

  }
}

/**
 * Update last login timestamp and create profile if missing
 * @param {string} userId - Firebase user UID
 * @param {string} email - User email
 */
export async function setLastLogin(userId, email) {
  if (!firebaseEnabled || !db) return;

  try {
    const userRef = doc(db, "userProfiles", userId);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      // Update existing profile
      await updateDoc(userRef, {
        "stats.lastLoginAt": serverTimestamp(),
        email,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new profile with login info and Basic tier
      await setDoc(userRef, {
        ...defaultUserProfile,
        uid: userId,
        email,
        stats: {
          lastLoginAt: serverTimestamp(),
          lastLogoutAt: null,
          totalOnlineSeconds: 0,
        },
        privileges: {
          tier: "Basic",
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error setting last login:", error);
  }
}

/**
 * Update last logout timestamp
 * @param {string} userId - Firebase user UID
 */
export async function setLastLogout(userId) {
  if (!firebaseEnabled || !db) return;

  try {
    const userRef = doc(db, "userProfiles", userId);
    await updateDoc(userRef, {
      "stats.lastLogoutAt": serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error setting last logout:", error);
  }
}

/**
 * Save session duration (called once on logout/tab close)
 * @param {string} userId - Firebase user UID
 * @param {number} elapsedSeconds - Number of seconds to add
 */
export async function saveSessionDuration(userId, elapsedSeconds) {
  if (!firebaseEnabled || !db) return;
  if (elapsedSeconds <= 0) return;

  try {
    const userRef = doc(db, "userProfiles", userId);
    await updateDoc(userRef, {
      "stats.totalOnlineSeconds": increment(elapsedSeconds),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error saving session duration:", error);
  }
}

/**
 * Update user's last known location (from Find Me)
 * @param {string} userId - Firebase user UID
 * @param {object} location - Location data
 * @param {number} location.lat - Latitude
 * @param {number} location.lon - Longitude
 * @param {string} [location.city] - City name
 * @param {string} [location.state] - State name
 */
export async function updateUserLocation(userId, location) {
  if (!firebaseEnabled || !db) return;
  if (!location?.lat || !location?.lon) return;

  try {
    await updateUserProfile(userId, {
      lastLocation: {
        lat: location.lat,
        lon: location.lon,
        city: location.city || null,
        state: location.state || null,
        updatedAt: serverTimestamp(),
      },
    });
  } catch (error) {
    console.error("Error updating user location:", error);
  }
}

export { db };
