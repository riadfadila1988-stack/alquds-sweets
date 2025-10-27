import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, I18nManager } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from '@/app/_i18n';
import { useEmployeeMonthlyDetails } from '@/hooks/use-employee-monthly-details';
import { formatHM } from '@/utils/date';
import { WorkSession } from '@/hooks/use-working-hours';
import Header from '../components/header';
import * as Location from 'expo-location';

// Simple in-memory cache for reverse geocoding results to avoid repeated calls
const geocodeCache = new Map<string, string>();

function weekdayKey(dateStr: string) {
  const d = new Date(dateStr);
  const idx = d.getDay(); // 0=Sun
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'] as const;
  return days[idx];
}

export default function EmployeeMonthDetail() {
  const { t } = useTranslation();
  const { id, y, m, name } = useLocalSearchParams<{ id: string; y?: string; m?: string, name?: string }>();
  const [cursor] = useState(() => {
    const year = y ? parseInt(String(y), 10) : new Date().getFullYear();
    const month = m ? parseInt(String(m), 10) : new Date().getMonth() + 1;
    return { y: year, m: month };
  });

  const { sessions, isLoading, error } = useEmployeeMonthlyDetails(id, cursor.y, cursor.m);

  const sortedSessions = useMemo(() => (sessions || []).slice().sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime()), [sessions]);

  const isRTL = I18nManager.isRTL;

  return (
    <View style={styles.container}>
      <Header title={t('employeeDetailsTitle') || 'Employee details'} />
      {name && (
        <Text style={[styles.subTitle, isRTL && { textAlign: 'center' }]}>{name} - {cursor.y}-{String(cursor.m).padStart(2, '0')}</Text>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={sortedSessions}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <DayRow item={item} t={t} isRTL={true} />}
          ListEmptyComponent={<Text style={styles.empty}>{t('noWorkDays')}</Text>}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}

function DayRow({ item, t, isRTL }: { item: WorkSession; t: (k: any) => string; isRTL: boolean }) {
  const wk = weekdayKey(item.clockIn);
  const total = item.duration;
  const dateLabel = new Date(item.clockIn).toISOString().split('T')[0];

  // Resolve addresses for locations (if a label isn't already provided)
  const [clockInAddress, setClockInAddress] = useState<string | null>(
    item.clockInLocation?.label || null
  );
  const [clockOutAddress, setClockOutAddress] = useState<string | null>(
    item.clockOutLocation?.label || null
  );

  useEffect(() => {
    let mounted = true;

    async function resolveIfNeeded() {
      try {
        // clock in
        if (
          mounted &&
          item.clockInLocation &&
          !item.clockInLocation.label &&
          (item.clockInLocation.latitude || item.clockInLocation.latitude === 0)
        ) {
          const lat = item.clockInLocation.latitude;
          const lon = item.clockInLocation.longitude;
          const cacheKey = `${lat},${lon}`;
          if (geocodeCache.has(cacheKey)) {
            setClockInAddress(geocodeCache.get(cacheKey) || null);
          } else {
            const coords = { latitude: lat, longitude: lon };
            const res = await Location.reverseGeocodeAsync(coords);
            if (mounted && res && res.length > 0) {
              const formatted = formatAddress(res[0]);
              geocodeCache.set(cacheKey, formatted);
              setClockInAddress(formatted);
            }
          }
        }

        // clock out
        if (
          mounted &&
          item.clockOutLocation &&
          !item.clockOutLocation.label &&
          (item.clockOutLocation.latitude || item.clockOutLocation.latitude === 0)
        ) {
          const lat = item.clockOutLocation.latitude;
          const lon = item.clockOutLocation.longitude;
          const cacheKey = `${lat},${lon}`;
          if (geocodeCache.has(cacheKey)) {
            setClockOutAddress(geocodeCache.get(cacheKey) || null);
          } else {
            const coords = { latitude: lat, longitude: lon };
            const res = await Location.reverseGeocodeAsync(coords);
            if (mounted && res && res.length > 0) {
              const formatted = formatAddress(res[0]);
              geocodeCache.set(cacheKey, formatted);
              setClockOutAddress(formatted);
            }
          }
        }
      } catch (err) {
        // If reverse geocoding fails, fall back to coordinates (already handled in render)
        // console.warn('Reverse geocode failed', err);
      }
    }

    resolveIfNeeded();
    return () => { mounted = false; };
  }, [item.clockInLocation?.latitude, item.clockInLocation?.longitude, item.clockOutLocation?.latitude, item.clockOutLocation?.longitude]);

  return (
    <View style={[styles.dayRow, isRTL && styles.dayRowRtl]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.dayTitle, isRTL && { textAlign: 'right' }]}>{dateLabel} • {t(wk as any)}</Text>
        <Text style={[styles.timeLine, isRTL && { textAlign: 'right' }]}>{t('startTime')}: {new Date(item.clockIn).toLocaleTimeString()}</Text>
        {item.clockInLocation ? (
          <Text style={[styles.timeLine, isRTL && { textAlign: 'right' }]}>
            {t('location') || 'Location'}: {clockInAddress ? clockInAddress : (item.clockInLocation.label ? item.clockInLocation.label : `${item.clockInLocation.latitude.toFixed(4)}, ${item.clockInLocation.longitude.toFixed(4)}`)}
          </Text>
        ) : null}
        {item.clockOut && <Text style={[styles.timeLine, isRTL && { textAlign: 'right' }]}>{t('endTime')}: {new Date(item.clockOut).toLocaleTimeString()}</Text>}
        {item.clockOutLocation ? (
          <Text style={[styles.timeLine, isRTL && { textAlign: 'right' }]}>
            {t('location') || 'Location'}: {clockOutAddress ? clockOutAddress : (item.clockOutLocation.label ? item.clockOutLocation.label : `${item.clockOutLocation.latitude.toFixed(4)}, ${item.clockOutLocation.longitude.toFixed(4)}`)}
          </Text>
        ) : null}
      </View>
      {total ? <Text style={[styles.total, isRTL && { marginStart: 0, marginEnd: 10 }]}>{formatHM(total)}</Text> : null}
    </View>
  );
}

function formatAddress(addr: any) {
  // addr object may contain: name, street, postalCode, city, region, country
  const parts: string[] = [];
  if (addr.name) parts.push(addr.name);
  if (addr.street) parts.push(addr.street);
  if (addr.city) parts.push(addr.city);
  if (addr.region) parts.push(addr.region);
  if (addr.postalCode) parts.push(addr.postalCode);
  if (addr.country) parts.push(addr.country);
  return parts.join(', ');
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  subTitle: { fontSize: 16, color: '#444', marginBottom: 12, textAlign: 'center' },
  empty: { textAlign: 'center', color: '#666', marginTop: 24 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd' },
  dayRowRtl: { flexDirection: 'row-reverse' },
  dayTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  timeLine: { fontSize: 14, color: '#555' },
  total: { fontSize: 16, fontWeight: '700', color: '#333', marginStart: 10 },
  errorText: { color: 'red', textAlign: 'center', marginTop: 20 },
});
