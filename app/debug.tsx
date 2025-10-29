import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ScrollView, Platform, I18nManager } from 'react-native';
import Constants from 'expo-constants';

export default function DebugScreen() {
  const [draggableSupported, setDraggableSupported] = useState<string>('unknown');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (Platform.OS === 'web') {
          setDraggableSupported('web - not supported');
          return;
        }
        // Try dynamic import like the screen does
        const mod = (await import('react-native-draggable-flatlist')).default;
        if (cancelled) return;
        if (mod) setDraggableSupported('OK');
      } catch (e: any) {
        if (cancelled) return;
        setDraggableSupported(String(e?.message || e || 'import failed'));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Runtime Debug</Text>
      <View style={styles.row}><Text style={styles.key}>Platform:</Text><Text style={styles.val}>{Platform.OS}</Text></View>
      <View style={styles.row}><Text style={styles.key}>isRTL (I18nManager):</Text><Text style={styles.val}>{String(I18nManager.isRTL)}</Text></View>
      <View style={styles.row}><Text style={styles.key}>document.dir (web):</Text><Text style={styles.val}>{typeof document !== 'undefined' ? document.documentElement.getAttribute('dir') : 'n/a'}</Text></View>
      <View style={styles.row}><Text style={styles.key}>Draggable module:</Text><Text style={styles.val}>{draggableSupported}</Text></View>
      <View style={styles.row}><Text style={styles.key}>Expo constants:</Text></View>
      <Text style={styles.json}>{JSON.stringify(Constants.manifest || Constants.expoConfig || Constants, null, 2)}</Text>
      <View style={{height: 20}} />
      <Button title="Clear AsyncStorage RTL flag (for test)" onPress={async () => {
        try {
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          await AsyncStorage.removeItem('RTL_WAS_SET');
          alert('RTL_WAS_SET removed');
        } catch (e: any) {
          alert('failed: ' + String(e?.message || e));
        }
      }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', marginBottom: 8 },
  key: { fontWeight: '600', marginRight: 8 },
  val: { flex: 1 },
  json: { fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier', fontSize: 12, marginTop: 8 }
});

