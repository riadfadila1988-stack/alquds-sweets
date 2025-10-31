import { I18nManager, Platform } from 'react-native';
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
    // Check if RTL was already enabled from a previous build
    const wasRTLEnabled = I18nManager.isRTL;

    // Force RTL to be enabled
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);

    // Web-specific RTL setup
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
      document.body.style.direction = 'rtl';
    }

    console.log('[RTL] Initialized - isRTL:', I18nManager.isRTL, 'Platform:', Platform.OS);

    // iOS-specific warning
    if (Platform.OS === 'ios' && !I18nManager.isRTL && !wasRTLEnabled) {
      console.warn('[RTL] ⚠️ iOS detected: forceRTL called but not active yet. A native rebuild is required.');
      console.warn('[RTL] Run: npx expo prebuild --clean && npx expo run:ios');
    }
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
    const shouldBeRTL = true; // Your app always uses RTL for Arabic

    // Store the desired RTL state
    await AsyncStorage.setItem(RTL_STORAGE_KEY, String(shouldBeRTL));

    // Web platform - just set DOM attributes
    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'ar');
        document.body.style.direction = 'rtl';
      }
      return false;
    }

    // Check if current state matches desired state
    if (I18nManager.isRTL !== shouldBeRTL) {
      console.log('[RTL] State mismatch. Current:', I18nManager.isRTL, 'Desired:', shouldBeRTL);

      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);

      if (Platform.OS === 'android') {
        // On Android, we need to reload for changes to take effect
        try {
          const Updates = await import('expo-updates');
          if (Updates.reloadAsync) {
            console.log('[RTL] Triggering reload to apply RTL...');
            await Updates.reloadAsync();
            return true;
          }
        } catch (e) {
          console.warn('[RTL] expo-updates not available:', e);
        }
      }
    }

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

