import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RTL_STORAGE_KEY = '@app:rtl_enabled';

/**
 * Initialize RTL settings for the app
 * Must be called early in app lifecycle, ideally at module level
 *
 * NOTE FOR iOS: I18nManager.forceRTL() must be called before the first render,
 * AND the app must be rebuilt (not just reloaded) for RTL to take effect.
 * This is an iOS limitation - RTL settings are cached at native level.
 */
export const initializeRTL = () => {
  try {
    // Do not modify native I18nManager at runtime here per app policy.
    // For web, ensure DOM direction is set to RTL so the page renders correctly.
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
      document.body.style.direction = 'rtl';
    }

    console.log('[RTL] Initialized (no native changes) - Platform:', Platform.OS);
  } catch (error) {
    console.error('[RTL] Failed to initialize:', error);
  }
};

/**
 * Check if RTL needs to be enabled and reload if necessary
 * Returns true if a reload was triggered
 */
export const ensureRTL = async (): Promise<boolean> => {
  try {
    // ensureRTL just sets web DOM direction and persists a preference locally
    const shouldBeRTL = true;
    await AsyncStorage.setItem(RTL_STORAGE_KEY, String(shouldBeRTL));
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
      document.body.style.direction = 'rtl';
    }
    // We intentionally do not call I18nManager.forceRTL here to avoid native reloads.
    return false;
  } catch (error) {
    console.error('[RTL] Error ensuring RTL:', error);
    return false;
  }
};

/**
 * Get the stored RTL preference
 */
export const getStoredRTLPreference = async (): Promise<boolean> => {
  try {
    const stored = await AsyncStorage.getItem(RTL_STORAGE_KEY);
    return stored === 'true';
  } catch (error) {
    console.error('[RTL] Error getting stored preference:', error);
    return true; // Default to RTL for Arabic app
  }
};
