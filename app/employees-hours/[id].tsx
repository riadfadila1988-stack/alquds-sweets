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
        <Text style={[styles.subTitle, isRTL ? { textAlign: 'right' } : undefined]}>{name} - {cursor.y}-{String(cursor.m).padStart(2, '0')}</Text>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={sortedSessions}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <DayRow item={item} t={t} isRTL={isRTL} />}
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

  // Helper to detect if a label is actually coordinates "lat, lon"
  const isCoordString = (s?: string | null) => typeof s === 'string' && /^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/.test(s);

  // Resolve addresses for locations (if a label isn't already provided or it's just raw coordinates)
  const [clockInAddress, setClockInAddress] = useState<string | null>(
    (item.clockInLocation?.label && !isCoordString(item.clockInLocation.label)) ? item.clockInLocation.label : null
  );
  const [clockOutAddress, setClockOutAddress] = useState<string | null>(
    (item.clockOutLocation?.label && !isCoordString(item.clockOutLocation.label)) ? item.clockOutLocation.label : null
  );
  const [clockInResolving, setClockInResolving] = useState(false);
  const [clockOutResolving, setClockOutResolving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function doReverseGeocode(lat: number, lon: number) {
      try {
        // Try the platform geocoder first
        const res = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        if (res && res.length > 0) {
          const formatted = formatAddress(res[0]);
          if (formatted) return formatted;
        }

        // Fallback: use OpenStreetMap Nominatim reverse geocoding (no API key required)
        // Note: Nominatim requires a valid User-Agent header; include a short app identifier.
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
          const resp = await fetch(url, { headers: { 'User-Agent': 'alquds-sweets-app', Accept: 'application/json' } });
          if (resp && resp.ok) {
            const body = await resp.json();
            if (body) {
              if (body.display_name) return String(body.display_name);
              // If display_name isn't present, try to build an address from the `address` object
              if (body.address && typeof body.address === 'object') {
                const a = body.address;
                const parts: string[] = [];
                // road/street + house number
                if (a.road) parts.push(a.road);
                if (a.house_number) parts.push(a.house_number);
                // suburb/neighbourhood
                if (a.suburb) parts.push(a.suburb);
                if (a.neighbourhood) parts.push(a.neighbourhood);
                // city/town/village
                if (a.city) parts.push(a.city);
                if (a.town) parts.push(a.town);
                if (a.village) parts.push(a.village);
                // state/county
                if (a.state) parts.push(a.state);
                if (a.county) parts.push(a.county);
                // postcode, country
                if (a.postcode) parts.push(a.postcode);
                if (a.country) parts.push(a.country);
                const built = parts.filter(Boolean).join(', ');
                if (built) return built;
              }
            }
          }
        } catch (fallbackErr) {
          console.warn('Nominatim reverse geocode failed', fallbackErr);
        }
      } catch (nativeErr) {
        console.warn('Platform reverseGeocodeAsync failed', nativeErr);
      }
      return null;
    }

    async function resolveIfNeeded() {
      try {
        // clock in
        if (
          mounted &&
          item.clockInLocation &&
          (!item.clockInLocation.label || isCoordString(item.clockInLocation.label)) &&
          // allow numeric strings too
          (item.clockInLocation.latitude !== undefined && item.clockInLocation.latitude !== null)
        ) {
          setClockInResolving(true);
          const latRaw = item.clockInLocation.latitude;
          const lonRaw = item.clockInLocation.longitude;
          const latNum = Number(latRaw);
          const lonNum = Number(lonRaw);
          if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
            setClockInResolving(false);
          } else {
            const cacheKey = `${latNum},${lonNum}`;
            if (geocodeCache.has(cacheKey)) {
              setClockInAddress(geocodeCache.get(cacheKey) || null);
              setClockInResolving(false);
            } else {
              const formatted = await doReverseGeocode(latNum, lonNum);
              if (mounted) {
                if (formatted) {
                  geocodeCache.set(cacheKey, formatted);
                  setClockInAddress(formatted);
                }
                setClockInResolving(false);
              }
            }
          }
        }

        // clock out
        if (
          mounted &&
          item.clockOutLocation &&
          (!item.clockOutLocation.label || isCoordString(item.clockOutLocation.label)) &&
          (item.clockOutLocation.latitude !== undefined && item.clockOutLocation.latitude !== null)
        ) {
          setClockOutResolving(true);
          const latRaw = item.clockOutLocation.latitude;
          const lonRaw = item.clockOutLocation.longitude;
          const latNum = Number(latRaw);
          const lonNum = Number(lonRaw);
          if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
            setClockOutResolving(false);
          } else {
            const cacheKey = `${latNum},${lonNum}`;
            if (geocodeCache.has(cacheKey)) {
              setClockOutAddress(geocodeCache.get(cacheKey) || null);
              setClockOutResolving(false);
            } else {
              const formatted = await doReverseGeocode(latNum, lonNum);
              if (mounted) {
                if (formatted) {
                  geocodeCache.set(cacheKey, formatted);
                  setClockOutAddress(formatted);
                }
                setClockOutResolving(false);
              }
            }
          }
        }
      } catch (err) {
        // If reverse geocoding fails, fall back to coordinates (already handled in render)
        console.warn('Reverse geocode failed', err);
        setClockInResolving(false);
        setClockOutResolving(false);
      }
    }

    resolveIfNeeded();
    return () => { mounted = false; };
  }, [item.clockInLocation, item.clockOutLocation]);

  // Helper: produce a display string for a given location object.
  // Prefer: reverse-geocoded address (resolved), then address fields on the location object, then provided label, then formatted coordinates.
  function formatLocationText(loc: any | undefined | null, resolved?: string | null) {
    if (!loc) return '';
    if (resolved) return resolved;
    // If the raw location object already contains address-like fields, prefer them
    const addrParts: string[] = [];
    if (loc.name) addrParts.push(String(loc.name));
    if (loc.street) addrParts.push(String(loc.street));
    if (loc.city) addrParts.push(String(loc.city));
    if (loc.region) addrParts.push(String(loc.region));
    if (loc.postalCode) addrParts.push(String(loc.postalCode));
    if (loc.country) addrParts.push(String(loc.country));
    const combined = addrParts.filter(Boolean).join(', ');
    if (combined) return combined;
    if (loc.label) return String(loc.label);
    // Accept numeric strings as well as numbers
    const latRaw = loc.latitude;
    const lonRaw = loc.longitude;
    const latNum = Number(latRaw);
    const lonNum = Number(lonRaw);
    if (Number.isFinite(latNum) && Number.isFinite(lonNum)) {
      return `${latNum.toFixed(6)}, ${lonNum.toFixed(6)}`;
    }
    return '';
  }

  return (
    <View style={[styles.dayRow, isRTL && styles.dayRowRtl]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.dayTitle, isRTL && { textAlign: 'right' }]}>{dateLabel} • {t(wk as any)}</Text>
        <Text style={[styles.timeLine, isRTL && { textAlign: 'right' }]}>{t('startTime')}: {new Date(item.clockIn).toLocaleTimeString()}</Text>
        {item.clockInLocation ? (
          <Text style={[styles.timeLine, isRTL && { textAlign: 'right' }]}>
            {t('location') || 'Location'}: {clockInResolving ? (t('resolvingAddress') || 'Resolving address...') : formatLocationText(item.clockInLocation, clockInAddress)}
          </Text>
        ) : null}
        {item.clockOut && <Text style={[styles.timeLine, isRTL && { textAlign: 'right' }]}>{t('endTime')}: {new Date(item.clockOut).toLocaleTimeString()}</Text>}
        {item.clockOutLocation ? (
          <Text style={[styles.timeLine, isRTL && { textAlign: 'right' }]}>
            {t('location') || 'Location'}: {clockOutResolving ? (t('resolvingAddress') || 'Resolving address...') : formatLocationText(item.clockOutLocation, clockOutAddress)}
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
  if (!addr) return '';
  // Different platforms/response shapes: check multiple possible fields
  if (addr.name) parts.push(String(addr.name));
  if (addr.street) parts.push(String(addr.street));
  if ((addr.street && addr.name) && addr.city) parts.push(String(addr.city));
  // Common alternative fields
  if ((addr.road) && !parts.length) parts.push(String(addr.road));
  if (addr.houseNumber) parts.push(String(addr.houseNumber));
  if (addr.house_number) parts.push(String(addr.house_number));
  if (addr.suburb) parts.push(String(addr.suburb));
  if (addr.city) parts.push(String(addr.city));
  if (addr.town) parts.push(String(addr.town));
  if (addr.village) parts.push(String(addr.village));
  if (addr.region) parts.push(String(addr.region));
  if (addr.county) parts.push(String(addr.county));
  if (addr.postalCode) parts.push(String(addr.postalCode));
  if (addr.postcode) parts.push(String(addr.postcode));
  if (addr.country) parts.push(String(addr.country));
  return parts.filter(Boolean).join(', ');
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
