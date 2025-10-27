/* eslint-disable import/no-duplicates */
import 'react-native-gesture-handler';
import React, { useEffect, useMemo } from 'react';
import { I18nManager, Platform, View, StyleSheet, DevSettings } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  useEffect(() => {
    try {
      // Ensure RTL is enabled and forced across the app
      if (!I18nManager.isRTL) {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(true);

        // Native: a full reload is required for forceRTL to take effect.
        // Avoid forcing an automatic reload here (can cause issues in Expo Go / some devices).
        // Ask the developer/user to reload the app manually instead.
        try {
          if (Platform.OS !== 'web' && DevSettings && typeof DevSettings.reload === 'function') {
            // NOTE: Disabled automatic reload to avoid native crashes or reload loops in Expo Go.
            // If you need RTL to take effect immediately, reload the app from the dev menu.
            // DevSettings.reload();
            // Log a helpful message in development instead.
             
            console.log('RTL was enabled. Please reload the app to apply RTL changes.');
          }
        } catch (reloadErr) {
          // ignore reload failure - user/dev tools can reload manually
          console.warn('Failed to reload app after forcing RTL:', reloadErr);
        }
      }

      // On web, also set the document direction attribute
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.documentElement.setAttribute('dir', 'rtl');
      }
    } catch (e) {
      console.warn('Failed to enforce RTL:', e);
    }
  }, []);

  const queryClient = useMemo(() => new QueryClient(), []);

  // Apply a root container with RTL writing direction to be safe
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
    // writingDirection ensures TextInput caret and text flow RTL in many cases
    writingDirection: 'rtl',
    backgroundColor: '#ffffff',
  },
});
