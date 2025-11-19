import React, {useMemo, useState, useEffect} from 'react';
import {View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {useTranslation} from '@/app/_i18n';
import {useEmployeeMonthlyDetails} from '@/hooks/use-employee-monthly-details';
import {formatHM} from '@/utils/date';
import {WorkSession} from '@/hooks/use-working-hours';
import * as Location from 'expo-location';
import {LinearGradient} from 'expo-linear-gradient';
import {Ionicons} from '@expo/vector-icons';
import Animated, {
    FadeInRight,
    BounceIn,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withRepeat,
    withSequence,
} from 'react-native-reanimated';
import {ScreenTemplate} from "@/components/ScreenTemplate";

// Simple in-memory cache for reverse geocoding results to avoid repeated calls
const geocodeCache = new Map<string, string>();

// Premium palette with fun, vibrant colors
const premiumColors = {
    backgroundGradient: ['#ffffff','#667eea',  '#764ba2', '#f093fb'] as const,
    cardBackground: '#ffffffee',
    accent: '#667eea',
    accentWeekend: '#ff6b6b',
    subtleText: '#4A5568',
    pillBg: '#667eea',
    pillText: '#fff',
    cardGradientWeekday: ['#ffffff', '#e0e7ff'] as const,
    cardGradientWeekend: ['#ffe5e5', '#fff0f0'] as const,
    celebration: ['#ffd700', '#ff6b6b', '#4ecdc4', '#667eea'],
};

function weekdayKey(dateStr: string) {
    const d = new Date(dateStr);
    const idx = d.getDay(); // 0=Sun
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    return days[idx];
}

// Helper to format address objects returned by reverse geocode / expo Location
function formatAddress(addr: any): string | null {
    if (!addr) return null;
    const parts: string[] = [];
    // Common fields across platforms
    if (addr.name) parts.push(String(addr.name));
    if (addr.street) parts.push(String(addr.street));
    if (addr.houseNumber) parts.push(String(addr.houseNumber));
    if (addr.house_number) parts.push(String(addr.house_number));
    // Fallbacks
    if (addr.road && !parts.length) parts.push(String(addr.road));
    if (addr.suburb) parts.push(String(addr.suburb));
    if (addr.neighbourhood) parts.push(String(addr.neighbourhood));
    if (addr.city) parts.push(String(addr.city));
    if (addr.town) parts.push(String(addr.town));
    if (addr.village) parts.push(String(addr.village));
    if (addr.region) parts.push(String(addr.region));
    if (addr.county) parts.push(String(addr.county));
    if (addr.postalCode) parts.push(String(addr.postalCode));
    if (addr.postcode) parts.push(String(addr.postcode));
    if (addr.country) parts.push(String(addr.country));
    const built = parts.filter(Boolean).join(', ');
    return built || null;
}

export default function EmployeeMonthDetail() {
    const {t} = useTranslation();
    const {id, y, m, name} = useLocalSearchParams<{ id: string; y?: string; m?: string, name?: string }>();
    const [cursor] = useState(() => {
        const year = y ? parseInt(String(y), 10) : new Date().getFullYear();
        const month = m ? parseInt(String(m), 10) : new Date().getMonth() + 1;
        return {y: year, m: month};
    });

    const {sessions, isLoading, error} = useEmployeeMonthlyDetails(id, cursor.y, cursor.m);

    const sortedSessions = useMemo(() => (sessions || []).slice().sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime()), [sessions]);

    const isRTL = true;

    const monthName = useMemo(() => new Date(cursor.y, cursor.m - 1, 1).toLocaleString(undefined, {month: 'long'}), [cursor.y, cursor.m]);

    // Fun floating animation values
    const float1 = useSharedValue(0);
    const float2 = useSharedValue(0);
    const float3 = useSharedValue(0);
    const scale = useSharedValue(1);

    useEffect(() => {
        // Floating emojis animation
        float1.value = withRepeat(
            withSequence(
                withSpring(-20, {damping: 2, stiffness: 80}),
                withSpring(0, {damping: 2, stiffness: 80})
            ),
            -1,
            true
        );
        float2.value = withRepeat(
            withSequence(
                withSpring(-30, {damping: 2, stiffness: 80}),
                withSpring(0, {damping: 2, stiffness: 80})
            ),
            -1,
            true
        );
        float3.value = withRepeat(
            withSequence(
                withSpring(-15, {damping: 2, stiffness: 80}),
                withSpring(0, {damping: 2, stiffness: 80})
            ),
            -1,
            true
        );

        // Pulsing scale animation
        scale.value = withRepeat(
            withSequence(
                withSpring(1.05, {damping: 2, stiffness: 100}),
                withSpring(1, {damping: 2, stiffness: 100})
            ),
            -1,
            true
        );
    }, [float1, float2, float3, scale]);

    const floatStyle1 = useAnimatedStyle(() => ({
        transform: [{translateY: float1.value}],
    }));

    const floatStyle2 = useAnimatedStyle(() => ({
        transform: [{translateY: float2.value}],
    }));

    const floatStyle3 = useAnimatedStyle(() => ({
        transform: [{translateY: float3.value}],
    }));

    const scaleStyle = useAnimatedStyle(() => ({
        transform: [{scale: scale.value}],
    }));

    return (
        <ScreenTemplate title={t('employeeDetailsTitle') || 'Employee details'}>
            <LinearGradient colors={[...premiumColors.backgroundGradient]} style={styles.gradient}>
                {/* Fun floating decorative elements */}
                <Animated.View style={[styles.floatingEmoji, {top: 120, left: 30}, floatStyle1]}>
                    <Text style={styles.emojiText}>⭐</Text>
                </Animated.View>
                <Animated.View style={[styles.floatingEmoji, {top: 200, right: 40}, floatStyle2]}>
                    <Text style={styles.emojiText}>🎉</Text>
                </Animated.View>
                <Animated.View style={[styles.floatingEmoji, {top: 160, right: 80}, floatStyle3]}>
                    <Text style={styles.emojiText}>✨</Text>
                </Animated.View>

                <View style={[styles.container]}>
                    {name ? (
                        <Animated.View entering={BounceIn.delay(200).springify()}>
                            <Animated.Text style={[styles.employeeName, isRTL && {textAlign: 'right'}, scaleStyle]}>
                                {name} 🌟
                            </Animated.Text>
                        </Animated.View>
                    ) : null}
                    <Animated.View
                        entering={FadeInRight.delay(300).springify()}
                        style={[styles.monthChipWrapper, isRTL && {alignItems: 'flex-end'}]}
                    >
                        <View style={styles.monthChip}>
                            <Ionicons name="calendar" size={16} color="#E2E8F0" style={{marginEnd: 6}}/>
                            <Text style={styles.monthChipText}>{monthName} {cursor.y}</Text>
                        </View>
                    </Animated.View>

                    {isLoading ? (
                        <Animated.View entering={BounceIn} style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={premiumColors.accent}/>
                            <Text style={styles.loadingText}>✨ Loading magic... ✨</Text>
                        </Animated.View>
                    ) : error ? (
                        <Text style={styles.errorText}>{error}</Text>
                    ) : (
                        <FlatList
                            data={sortedSessions}
                            keyExtractor={(item) => item._id}
                            renderItem={({item, index}) => <DayRow item={item} t={t} isRTL={isRTL} index={index}/>}
                            ListEmptyComponent={
                                <Animated.View entering={BounceIn.delay(300)} style={styles.emptyContainer}>
                                    <Text style={styles.emptyEmoji}>😴</Text>
                                    <Text style={styles.empty}>{t('noWorkDays')}</Text>
                                    <Text style={styles.emptySubtext}>Time to get to work! 💪</Text>
                                </Animated.View>
                            }
                            contentContainerStyle={{paddingBottom: 24}}
                        />
                    )}
                </View>
            </LinearGradient>
        </ScreenTemplate>
    );
}

function DayRow({item, t, isRTL, index}: { item: WorkSession; t: (k: any) => string; isRTL: boolean; index: number }) {
    const wk = weekdayKey(item.clockIn);
    const total = item.duration;
    const dateLabel = new Date(item.clockIn).toISOString().split('T')[0];

    // Animated press interaction
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{scale: scale.value}],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.95, {damping: 10, stiffness: 400});
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, {damping: 10, stiffness: 400});
    };

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
                const res = await Location.reverseGeocodeAsync({latitude: lat, longitude: lon});
                if (res && res.length > 0) {
                    const formatted = formatAddress(res[0]);
                    if (formatted) return formatted;
                }

                // Fallback: use OpenStreetMap Nominatim reverse geocoding (no API key required)
                // Note: Nominatim requires a valid User-Agent header; include a short app identifier.
                try {
                    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
                    const resp = await fetch(url, {
                        headers: {
                            'User-Agent': 'alquds-sweets-app',
                            Accept: 'application/json'
                        }
                    });
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
        return () => {
            mounted = false;
        };
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

    const isWeekend = [0, 6].includes(new Date(item.clockIn).getDay());

    return (
        // Outer plain wrapper: allows RN LayoutAnimation to animate layout changes
        <Animated.View
            entering={FadeInRight.delay(index * 100).springify()}
            style={[styles.dayRowWrapper, isRTL && styles.dayRowWrapperRtl]}
        >
            <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={{flex: 1}}
            >
                {/* Inner Animated.View handles Reanimated transforms without being affected by layout animation on the wrapper */}
                <Animated.View
                    style={animatedStyle}
                >
                    <View
                        style={[styles.accentBar, {backgroundColor: isWeekend ? premiumColors.accentWeekend : premiumColors.accent}]}/>
                    <LinearGradient
                        colors={isWeekend ? premiumColors.cardGradientWeekend : premiumColors.cardGradientWeekday}
                        style={[styles.dayRow, isRTL && styles.dayRowRtl]}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 1}}
                    >
                        <View style={{flex: 1}}>
                            <View style={[styles.iconRow, isRTL && styles.iconRowRtl]}>
                                <Ionicons name="calendar-outline" size={18}
                                          color={isWeekend ? premiumColors.accentWeekend : premiumColors.accent}
                                          style={styles.icon}/>
                                <Text
                                    style={[styles.dayTitle, isRTL && {textAlign: 'right'}]}>{dateLabel} • {t(wk as any)}</Text>
                            </View>
                            <View style={[styles.iconRow, isRTL && styles.iconRowRtl]}>
                                <Ionicons name="play-circle-outline" size={16} color={premiumColors.subtleText}
                                          style={styles.icon}/>
                                <Text
                                    style={[styles.timeLine, isRTL && {textAlign: 'right'}]}>{t('startTime')}: {new Date(item.clockIn).toLocaleTimeString()}</Text>
                            </View>
                            {item.clockInLocation ? (
                                <View style={[styles.iconRow, isRTL && styles.iconRowRtl]}>
                                    <Ionicons name="location-outline" size={16} color={premiumColors.subtleText}
                                              style={styles.icon}/>
                                    <Text
                                        style={[styles.timeLine, isRTL && {textAlign: 'right'}]}> {t('location') || 'Location'}: {clockInResolving ? (t('resolvingAddress') || 'Resolving address...') : formatLocationText(item.clockInLocation, clockInAddress)} </Text>
                                </View>
                            ) : null}
                            {item.clockOut && (
                                <View style={[styles.iconRow, isRTL && styles.iconRowRtl]}>
                                    <Ionicons name="stop-circle-outline" size={16} color={premiumColors.subtleText}
                                              style={styles.icon}/>
                                    <Text
                                        style={[styles.timeLine, isRTL && {textAlign: 'right'}]}>{t('endTime')}: {new Date(item.clockOut).toLocaleTimeString()}</Text>
                                </View>
                            )}
                            {item.clockOutLocation ? (
                                <View style={[styles.iconRow, isRTL && styles.iconRowRtl]}>
                                    <Ionicons name="location-outline" size={16} color={premiumColors.subtleText}
                                              style={styles.icon}/>
                                    <Text
                                        style={[styles.timeLine, isRTL && {textAlign: 'right'}]}> {t('location') || 'Location'}: {clockOutResolving ? (t('resolvingAddress') || 'Resolving address...') : formatLocationText(item.clockOutLocation, clockOutAddress)} </Text>
                                </View>
                            ) : null}
                        </View>
                        {total ? (
                            <View style={styles.totalPill}>
                                <Ionicons name="time-outline" size={14} color={premiumColors.pillText}
                                          style={{marginEnd: 4}}/>
                                <Text style={styles.totalPillText}>{formatHM(total)}</Text>
                            </View>
                        ) : null}
                    </LinearGradient>
                </Animated.View>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    gradient: {flex: 1},
    container: {flex: 1, padding: 16},
    employeeName: {
        fontSize: 28,
        fontWeight: '800',
        color: '#F7FAFC',
        marginTop: 4,
        marginBottom: 8,
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: {width: 0, height: 2},
        textShadowRadius: 4,
    },
    monthChipWrapper: {marginBottom: 16},
    monthChip: {
        alignSelf: 'flex-start',
        backgroundColor: '#ffffff1a',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: {width: 0, height: 4},
    },
    monthChipText: {
        color: '#E2E8F0',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 60,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '600',
        color: '#F7FAFC',
        letterSpacing: 0.5,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    empty: {
        textAlign: 'center',
        color: '#E2E8F0',
        fontSize: 18,
        fontWeight: '600',
        marginTop: 12,
    },
    emptySubtext: {
        textAlign: 'center',
        color: '#CBD5E0',
        fontSize: 14,
        marginTop: 8,
    },
    floatingEmoji: {
        position: 'absolute',
        zIndex: 1,
    },
    emojiText: {
        fontSize: 36,
        opacity: 0.6,
    },
    dayRowWrapper: {
        flexDirection: 'row',
        marginBottom: 14,
    },
    dayRowWrapperRtl: {flexDirection: 'row-reverse'},
    accentBar: {
        width: 6,
        borderRadius: 6,
        marginRight: 12,
        marginLeft: 2,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 4,
        shadowOffset: {width: 0, height: 2},
    },
    dayRow: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: {width: 0, height: 6},
        elevation: 6,
    },
    dayRowRtl: {flexDirection: 'row-reverse'},
    dayTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
        color: '#1A202C',
        letterSpacing: 0.3,
    },
    iconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    iconRowRtl: {flexDirection: 'row-reverse'},
    icon: {marginRight: 8},
    timeLine: {
        fontSize: 13,
        color: premiumColors.subtleText,
        letterSpacing: 0.2,
    },
    totalPill: {
        flexDirection: 'row',
        backgroundColor: premiumColors.pillBg,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 24,
        minWidth: 80,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: premiumColors.accent,
        shadowOpacity: 0.4,
        shadowRadius: 8,
        shadowOffset: {width: 0, height: 4},
        elevation: 4,
    },
    totalPillText: {
        color: premiumColors.pillText,
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    errorText: {
        color: '#FED7D7',
        textAlign: 'center',
        marginTop: 20,
        fontWeight: '600',
        fontSize: 16,
    },
});
