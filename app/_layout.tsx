import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect, useMemo, useState } from 'react';
import { I18nManager, Platform, View, StyleSheet, Alert, Text } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ensure RTL is enabled early (module initialization) so it can take effect before
// the app mounts. This is critical for iOS where RTL must be set before first render.
const isRTLRequired = true; // Set to true for Arabic/RTL languages

// CRITICAL: Set RTL at module level BEFORE any components render
// This must happen synchronously at module initialization
if (isRTLRequired) {
  try {
    // Always force RTL regardless of current state
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
    console.log('[RTL-INIT] Module-level RTL forced. isRTL:', I18nManager.isRTL, 'Platform:', Platform.OS);
  } catch (error) {
    console.error('[RTL-INIT] Failed to force RTL at module level:', error);
  }
}

// On web, set document direction at module init
if (Platform.OS === 'web') {
  try {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
      document.body.style.direction = 'rtl';
      console.log('[RTL-INIT] Web RTL direction set');
    }
  } catch (e) {
    console.error('[RTL-INIT] Failed to set web RTL:', e);
  }
}

export default function RootLayout() {
  const [needsRestart, setNeedsRestart] = useState(false);

  useEffect(() => {
    const checkAndSetupRTL = async () => {
      try {
        console.log('[RTL-CHECK] Starting RTL verification...');
        console.log('[RTL-CHECK] Current I18nManager.isRTL:', I18nManager.isRTL);
        console.log('[RTL-CHECK] Platform:', Platform.OS);

        // Check if this is the first time we're setting RTL
        const rtlWasSet = await AsyncStorage.getItem('RTL_WAS_SET');

        if (Platform.OS === 'ios') {
          // iOS specific handling
          if (!I18nManager.isRTL) {
            console.error('[RTL-CHECK] ⚠️ RTL is NOT active on iOS!');

            if (rtlWasSet !== 'true') {
              // First time - set RTL and mark it
              I18nManager.allowRTL(true);
              I18nManager.forceRTL(true);
              await AsyncStorage.setItem('RTL_WAS_SET', 'true');

              console.log('[RTL-CHECK] RTL has been set for the first time.');
              console.log('[RTL-CHECK] ⚠️ iOS REQUIRES A COMPLETE APP RESTART!');

              // Show alert to user
              setNeedsRestart(true);
              setTimeout(() => {
                Alert.alert(
                  'إعادة تشغيل مطلوبة / Restart Required',
                  'يرجى إغلاق التطبيق تمامًا وإعادة فتحه لتطبيق الاتجاه من اليمين إلى اليسار.\n\nPlease completely close the app and reopen it to apply RTL layout.\n\niOS: Double tap home button or swipe up, then swipe app away.',
                  [{ text: 'موافق / OK' }]
                );
              }, 1000);
            } else {
              // RTL was set before but still not active - something is wrong
              console.error('[RTL-CHECK] RTL was set previously but is still not active!');
              console.error('[RTL-CHECK] You may need to rebuild: npx expo prebuild --clean && npx expo run:ios');

              Alert.alert(
                'خطأ RTL / RTL Error',
                'RTL is not working. Please rebuild the app:\n\nnpx expo prebuild --clean\nnpx expo run:ios\n\nThen completely close and reopen the app.',
                [{ text: 'OK' }]
              );
            }
          } else {
            console.log('[RTL-CHECK] ✅ RTL is active on iOS!');
            await AsyncStorage.setItem('RTL_WAS_SET', 'true');
          }
        } else if (Platform.OS === 'android') {
          // Android handling
          if (!I18nManager.isRTL) {
            console.log('[RTL-CHECK] Setting RTL on Android...');
            I18nManager.allowRTL(true);
            I18nManager.forceRTL(true);
          } else {
            console.log('[RTL-CHECK] ✅ RTL is active on Android!');
          }
        } else if (Platform.OS === 'web') {
          // Web handling
          if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('dir', 'rtl');
            document.documentElement.setAttribute('lang', 'ar');
            document.body.style.direction = 'rtl';
          }
          console.log('[RTL-CHECK] ✅ RTL is set on Web!');
        }
      } catch (error) {
        console.error('[RTL-CHECK] Error during RTL setup:', error);
      }
    };

    checkAndSetupRTL();
  }, []);

  const queryClient = useMemo(() => new QueryClient(), []);

  // Show restart warning if needed
  if (needsRestart && Platform.OS === 'ios') {
    return (
      <View style={[styles.root, styles.centerContent]}>
        <Text style={styles.warningTitle}>⚠️ إعادة تشغيل مطلوبة</Text>
        <Text style={styles.warningTitle}>⚠️ Restart Required</Text>
        <Text style={styles.warningText}>
          {'يرجى إغلاق التطبيق تمامًا وإعادة فتحه\n'}
          {'Please completely close and reopen the app\n\n'}
          {'iOS: Double tap home → Swipe app away → Relaunch'}
        </Text>
      </View>
    );
  }

  // Apply root container with proper RTL support
  // RTL layout direction is controlled by I18nManager.forceRTL()
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.root}>
          <StatusBar style="dark" backgroundColor="#ffffff" />
          <Slot />
        </View>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  warningTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#ff6b6b',
  },
  warningText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    color: '#333',
  },
});
