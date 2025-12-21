// /src/context/UserProfileContext.js
// Context for managing user profiles throughout the app

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import {
  getUserProfile,
  updateUserProfile,
  updateMapPreferences,
  addFavorite,
  removeFavorite,
  isFavorite,
  addPreferredStation,
  removePreferredStation,
  defaultUserProfile,
} from "@/lib/userProfile";

const UserProfileContext = createContext(null);
export const useUserProfile = () => useContext(UserProfileContext);

export function UserProfileProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user profile when user logs in
  useEffect(() => {
    async function loadProfile() {
      if (authLoading) return;

      if (!user) {
        // Not logged in - use default profile from localStorage or defaults
        const localProfile = localStorage.getItem("guestProfile");
        setProfile(localProfile ? JSON.parse(localProfile) : defaultUserProfile);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userProfile = await getUserProfile(user.uid);
        setProfile(userProfile);
      } catch (error) {
        console.error("Error loading user profile:", error);
        setProfile(defaultUserProfile);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user, authLoading]);

  // Save guest profile to localStorage
  useEffect(() => {
    if (!user && profile) {
      localStorage.setItem("guestProfile", JSON.stringify(profile));
    }
  }, [profile, user]);

  // Update map preferences
  const saveMapPreferences = useCallback(
    async (preferences) => {
      const newPreferences = {
        ...profile.mapPreferences,
        ...preferences,
      };

      setProfile((prev) => ({
        ...prev,
        mapPreferences: newPreferences,
      }));

      if (user) {
        try {
          await updateMapPreferences(user.uid, newPreferences);
        } catch (error) {
          console.error("Error saving map preferences:", error);
        }
      }
    },
    [user, profile]
  );

  // Toggle favorite
  const toggleFavorite = useCallback(
    async (type, itemId) => {
      if (!profile) return;

      const isCurrentlyFavorited = isFavorite(profile, type, itemId);

      // Update local state immediately for responsiveness
      setProfile((prev) => {
        const currentFavorites = prev.favorites?.[type] || [];
        const newFavorites = isCurrentlyFavorited
          ? currentFavorites.filter((id) => id !== itemId)
          : [...currentFavorites, itemId];

        return {
          ...prev,
          favorites: {
            ...prev.favorites,
            [type]: newFavorites,
          },
        };
      });

      // Sync with Firestore if logged in
      if (user) {
        try {
          if (isCurrentlyFavorited) {
            await removeFavorite(user.uid, type, itemId);
          } else {
            await addFavorite(user.uid, type, itemId);
          }
        } catch (error) {
          console.error("Error toggling favorite:", error);
          // Revert on error
          setProfile((prev) => {
            const currentFavorites = prev.favorites?.[type] || [];
            const revertedFavorites = isCurrentlyFavorited
              ? [...currentFavorites, itemId]
              : currentFavorites.filter((id) => id !== itemId);

            return {
              ...prev,
              favorites: {
                ...prev.favorites,
                [type]: revertedFavorites,
              },
            };
          });
        }
      }
    },
    [user, profile]
  );

  // Check if item is favorited
  const checkIsFavorite = useCallback(
    (type, itemId) => {
      return isFavorite(profile, type, itemId);
    },
    [profile]
  );

  // Toggle preferred station
  const togglePreferredStation = useCallback(
    async (stationId) => {
      if (!profile) return;

      const currentStations = profile.cachedData?.preferredStations || [];
      const isPreferred = currentStations.includes(stationId);

      // Update local state
      setProfile((prev) => {
        const newStations = isPreferred
          ? currentStations.filter((id) => id !== stationId)
          : [...currentStations, stationId];

        return {
          ...prev,
          cachedData: {
            ...prev.cachedData,
            preferredStations: newStations,
          },
        };
      });

      // Sync with Firestore if logged in
      if (user) {
        try {
          if (isPreferred) {
            await removePreferredStation(user.uid, stationId);
          } else {
            await addPreferredStation(user.uid, stationId);
          }
        } catch (error) {
          console.error("Error toggling preferred station:", error);
        }
      }
    },
    [user, profile]
  );

  // Update cached data
  const updateCachedRiverData = useCallback(
    async (data) => {
      setProfile((prev) => ({
        ...prev,
        cachedData: {
          ...prev.cachedData,
          lastSeenRiverData: data,
          lastUpdated: new Date().toISOString(),
        },
      }));

      if (user) {
        try {
          await updateUserProfile(user.uid, {
            "cachedData.lastSeenRiverData": data,
            "cachedData.lastUpdated": new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error updating cached data:", error);
        }
      }
    },
    [user]
  );

  // Update offline mode
  const updateOfflineSettings = useCallback(
    async (settings) => {
      setProfile((prev) => ({
        ...prev,
        offlineMode: {
          ...prev.offlineMode,
          ...settings,
        },
      }));

      if (user) {
        try {
          await updateUserProfile(user.uid, {
            offlineMode: {
              ...profile.offlineMode,
              ...settings,
            },
          });
        } catch (error) {
          console.error("Error updating offline settings:", error);
        }
      }
    },
    [user, profile]
  );

  const value = {
    profile,
    loading,
    saveMapPreferences,
    toggleFavorite,
    checkIsFavorite,
    togglePreferredStation,
    updateCachedRiverData,
    updateOfflineSettings,
    isLoggedIn: !!user,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading profile...
      </div>
    );
  }

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}
