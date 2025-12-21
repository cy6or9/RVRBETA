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
};

/**
 * Create a new user profile in Firestore
 * @param {string} userId - Firebase user UID
 * @param {object} initialData - Optional initial data to merge with defaults
 * @returns {Promise<object>} Created profile
 */
export async function createUserProfile(userId, initialData = {}) {
  if (!firebaseEnabled || !db) {
    console.warn("Firestore not enabled");
    return null;
  }

  try {
    const userRef = doc(db, "userProfiles", userId);
    const profile = {
      ...defaultUserProfile,
      ...initialData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, profile);
    console.log("User profile created:", userId);
    return profile;
  } catch (error) {
    console.error("Error creating user profile:", error);
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
    console.warn("Firestore not enabled, returning default profile");
    return defaultUserProfile;
  }

  try {
    const userRef = doc(db, "userProfiles", userId);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // Create profile if it doesn't exist
      console.log("Profile not found, creating new one");
      return await createUserProfile(userId);
    }
  } catch (error) {
    console.error("Error getting user profile:", error);
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
    console.warn("Firestore not enabled");
    return;
  }

  try {
    const userRef = doc(db, "userProfiles", userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    console.log("User profile updated:", userId);
  } catch (error) {
    console.error("Error updating user profile:", error);
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
    console.error("Error adding favorite:", error);
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
    console.error("Error removing favorite:", error);
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
    console.error("Error adding preferred station:", error);
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
    console.error("Error removing preferred station:", error);
  }
}

export { db };
