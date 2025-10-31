import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect, useMemo, useState } from 'react';
import { I18nManager, Platform, View, StyleSheet, Alert, Text } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initializeRTL, ensureRTL } from '../utils/rtl';

// CRITICAL: Initialize RTL at module level BEFORE any components render
// This runs every time the module loads (including app restarts)
initializeRTL();

export default function RootLayout() {
  const [needsRestart, setNeedsRestart] = useState(false);

  useEffect(() => {
    const setupRTL = async () => {
      try {
        console.log('[RTL-CHECK] Verifying RTL setup...');
        console.log('[RTL-CHECK] Current I18nManager.isRTL:', I18nManager.isRTL);
        console.log('[RTL-CHECK] Platform:', Platform.OS);

        // Ensure RTL is properly set and reload if needed
        const reloadTriggered = await ensureRTL();

        if (!I18nManager.isRTL && !reloadTriggered) {
          // If RTL is still not active and we didn't trigger a reload
          if (Platform.OS === 'ios') {
            console.warn('[RTL-CHECK] ⚠️ RTL not active on iOS - manual restart required');
            setNeedsRestart(true);
            setTimeout(() => {
              Alert.alert(
                'إعادة تشغيل مطلوبة / Restart Required',
                'يرجى إغلاق التطبيق تمامًا وإعادة فتحه لتطبيق الاتجاه من اليمين إلى اليسار.\n\nPlease completely close the app and reopen it to apply RTL layout.\n\niOS: Double tap home button or swipe up, then swipe app away.',
                [{ text: 'موافق / OK' }]
              );
            }, 1000);
          } else {
            console.warn('[RTL-CHECK] ⚠️ RTL not active - please restart the app');
          }
        } else {
          console.log('[RTL-CHECK] ✅ RTL is properly configured!');
        }
      } catch (error) {
        console.error('[RTL-CHECK] Error during RTL setup:', error);
      }
    };

    setupRTL();
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
