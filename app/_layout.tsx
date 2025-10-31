import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect, useMemo } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initializeRTL, ensureRTL } from '@/utils/rtl';

// CRITICAL: Initialize RTL at module level BEFORE any components render
// This runs every time the module loads (including app restarts)
initializeRTL();

export default function RootLayout() {
  useEffect(() => {
    const setupRTL = async () => {
      try {
        // This app enforces RTL layout. We no longer query native I18nManager at runtime.
        const isRTL = true;
        console.log('[RTL-CHECK] Enforcing RTL at runtime. isRTL:', isRTL, 'Platform:', Platform.OS);

        // Ensure web DOM dir is set and persist preference if necessary
        await ensureRTL();

        // On iOS native-level RTL may require a rebuild. Informational only.
        if (Platform.OS === 'ios') {
          console.log('[RTL-CHECK] iOS detected: native RTL may require a rebuild for some effects.');
        }
      } catch (error) {
        console.error('[RTL-CHECK] Error during RTL setup:', error);
      }
    };

    setupRTL();
  }, []);

  const queryClient = useMemo(() => new QueryClient(), []);

  // No restart UI required; app enforces RTL in JS and web DOM.
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
