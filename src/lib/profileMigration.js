// /src/lib/profileMigration.js
// Helper functions for migrating guest profiles to authenticated users

/**
 * Migrate guest profile from localStorage to Firestore when user signs in
 * Call this in AuthContext when user first logs in
 */
export async function migrateGuestProfileToUser(userId, updateUserProfile) {
  try {
    const guestProfile = localStorage.getItem('guestProfile');
    
    if (!guestProfile) {
      console.log('No guest profile to migrate');
      return false;
    }

    const parsed = JSON.parse(guestProfile);
    
    // Merge guest preferences with new user profile
    await updateUserProfile(userId, {
      mapPreferences: parsed.mapPreferences || {},
      favorites: parsed.favorites || { locksDams: [], towns: [], marinas: [] },
      cachedData: {
        ...parsed.cachedData,
        preferredStations: parsed.cachedData?.preferredStations || [],
      },
    });

    // Clear guest profile after successful migration
    localStorage.removeItem('guestProfile');
    
    console.log('✅ Guest profile migrated to user account');
    return true;
  } catch (error) {
    console.error('Error migrating guest profile:', error);
    return false;
  }
}

/**
 * Export user profile for backup or transfer
 */
export function exportUserProfile(profile) {
  const dataStr = JSON.stringify(profile, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `rivervalley-profile-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
}

/**
 * Import user profile from backup file
 */
export async function importUserProfile(file, userId, updateUserProfile) {
  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    
    // Validate structure
    if (!imported.mapPreferences && !imported.favorites) {
      throw new Error('Invalid profile file');
    }
    
    // Remove timestamps (will be regenerated)
    delete imported.createdAt;
    delete imported.updatedAt;
    
    await updateUserProfile(userId, imported);
    
    return { success: true, message: 'Profile imported successfully' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Reset profile to defaults
 */
export async function resetUserProfile(userId, updateUserProfile, defaultUserProfile) {
  try {
    await updateUserProfile(userId, {
      mapPreferences: defaultUserProfile.mapPreferences,
      favorites: defaultUserProfile.favorites,
      offlineMode: defaultUserProfile.offlineMode,
    });
    
    return true;
  } catch (error) {
    console.error('Error resetting profile:', error);
    return false;
  }
}
