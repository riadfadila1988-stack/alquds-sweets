import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useTranslation } from './_i18n';
import { useWorkingHours } from '@/hooks/use-working-hours';
import { useThemeColor } from '@/hooks/use-theme-color';
import {ScreenTemplate} from "@/components/ScreenTemplate";

export default function WorkingHoursScreen() {
  const { t } = useTranslation();
  const { currentSession, todaySessions, isLoading, error, clockIn, clockOut, getTodayTotalHours, formatDuration } = useWorkingHours();
  const isRTL = true;
  const rtlTextAlign: 'left' | 'right' = 'right';
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'tint');

  // animated scale for the main action button
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // pulse animation for status when clocked in
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // floating emojis animations
  const emoji1Anim = useRef(new Animated.Value(0)).current;
  const emoji2Anim = useRef(new Animated.Value(0)).current;
  const emoji3Anim = useRef(new Animated.Value(0)).current;
  const emoji4Anim = useRef(new Animated.Value(0)).current;
  const emoji5Anim = useRef(new Animated.Value(0)).current;

  // confetti animation
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiAnim = useRef(new Animated.Value(0)).current;

  // rocket animation
  const [showRocket, setShowRocket] = useState(false);
  const rocketY = useRef(new Animated.Value(0)).current;
  const rocketX = useRef(new Animated.Value(0)).current;
  const rocketRotate = useRef(new Animated.Value(0)).current;
  const rocketScale = useRef(new Animated.Value(0)).current;
  const rocketOpacity = useRef(new Animated.Value(0)).current;

  // shimmer animation for buttons
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // glowing aura for status card
  const glowAnim = useRef(new Animated.Value(0)).current;

  // progress bar animation
  const progressAnim = useRef(new Animated.Value(0)).current;

  // timer for current session
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // addresses for locations
  const [addresses, setAddresses] = useState<{[key: string]: {clockIn?: string, clockOut?: string}}>({});

  // card entrance animations
  // initialize to sensible non-zero scales so cards aren't collapsed if animation hasn't run yet
  const statusCardAnim = useRef(new Animated.Value(0.92)).current;
  const buttonAnim = useRef(new Animated.Value(0.98)).current;
  const hoursCardAnim = useRef(new Animated.Value(0.92)).current;
  const historyCardAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (currentSession) {
      // start pulse when clocked in (use JS driver to keep driver consistent across the app)
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        ])
      ).start();
    } else {
      // stop pulse when clocked out
      pulseAnim.setValue(1);
    }
  }, [currentSession, pulseAnim]);

  // floating emojis animation
  useEffect(() => {
    const animateEmoji = (anim: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: -10, duration: 2000 + delay, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.timing(anim, { toValue: 10, duration: 2000 + delay, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        ])
      ).start();
    };
    animateEmoji(emoji1Anim, 0);
    animateEmoji(emoji2Anim, 500);
    animateEmoji(emoji3Anim, 1000);
    animateEmoji(emoji4Anim, 1500);
    animateEmoji(emoji5Anim, 2000);
  }, [emoji1Anim, emoji2Anim, emoji3Anim, emoji4Anim, emoji5Anim]);

  // shimmer animation for buttons
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
      ])
    ).start();
  }, [shimmerAnim]);

  // glowing aura for status card when clocked in
  useEffect(() => {
    if (currentSession) {
      Animated.loop(
        Animated.sequence([
          // keep glow on JS driver
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        ])
      ).start();
    } else {
      glowAnim.setValue(0);
    }
  }, [currentSession, glowAnim]);

  // progress bar animation
  useEffect(() => {
    let totalMinutes = getTodayTotalHours();
    if (currentSession) {
      totalMinutes += elapsedSeconds / 60;
    }
    const progress = Math.min(totalMinutes / 480, 1);
    progressAnim.setValue(progress);
  }, [getTodayTotalHours, progressAnim, currentSession, elapsedSeconds]);

  // card entrance animations
  useEffect(() => {
    Animated.stagger(200, [
      Animated.spring(statusCardAnim, { toValue: 1, friction: 8, useNativeDriver: false }),
      Animated.spring(buttonAnim, { toValue: 1, friction: 8, useNativeDriver: false }),
      Animated.spring(hoursCardAnim, { toValue: 1, friction: 8, useNativeDriver: false }),
      Animated.spring(historyCardAnim, { toValue: 1, friction: 8, useNativeDriver: false }),
    ]).start();
  }, [statusCardAnim, buttonAnim, hoursCardAnim, historyCardAnim]);

  // timer update for current session
  useEffect(() => {
    if (currentSession) {
      const interval = setInterval(() => {
        const now = Date.now();
        const start = new Date(currentSession.clockIn).getTime();
        setElapsedSeconds(Math.floor((now - start) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedSeconds(0);
    }
  }, [currentSession]);

  // fetch addresses for locations
  useEffect(() => {
    const fetchAddresses = async () => {
      const newAddresses: {[key: string]: {clockIn?: string, clockOut?: string}} = {};
      for (const session of todaySessions) {
        if (session.clockInLocation && !session.clockInLocation.label) {
          try {
            const result = await Location.reverseGeocodeAsync({
              latitude: session.clockInLocation.latitude,
              longitude: session.clockInLocation.longitude,
            });
            if (result.length > 0) {
              const addr = result[0];
              const address = [addr.name, addr.street, addr.city, addr.region, addr.country].filter(Boolean).join(', ') || 'Unknown location';
              newAddresses[session._id] = { ...newAddresses[session._id], clockIn: address };
            }
          } catch (e) {
            console.warn('Reverse geocode error for clockIn', e);
          }
        }
        if (session.clockOutLocation && !session.clockOutLocation.label) {
          try {
            const result = await Location.reverseGeocodeAsync({
              latitude: session.clockOutLocation.latitude,
              longitude: session.clockOutLocation.longitude,
            });
            if (result.length > 0) {
              const addr = result[0];
              const address = [addr.name, addr.street, addr.city, addr.region, addr.country].filter(Boolean).join(', ') || 'Unknown location';
              newAddresses[session._id] = { ...newAddresses[session._id], clockOut: address };
            }
          } catch (e) {
            console.warn('Reverse geocode error for clockOut', e);
          }
        }
      }
      setAddresses(newAddresses);
    };
    fetchAddresses();
  }, [todaySessions]);

  const animatePressIn = () => {
    Animated.timing(scaleAnim, { toValue: 0.96, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  };

  const animatePressOut = () => {
    Animated.timing(scaleAnim, { toValue: 1, duration: 180, easing: Easing.out(Easing.elastic(1)), useNativeDriver: false }).start();
  };

  const launchRocket = () => {
    setShowRocket(true);
    rocketY.setValue(0);
    rocketX.setValue(0);
    rocketRotate.setValue(0);
    rocketScale.setValue(0.5);
    rocketOpacity.setValue(1);

    // shake
    Animated.sequence([
      Animated.timing(rocketX, { toValue: -15, duration: 100, useNativeDriver: false }),
      Animated.timing(rocketX, { toValue: 15, duration: 100, useNativeDriver: false }),
      Animated.timing(rocketX, { toValue: -15, duration: 100, useNativeDriver: false }),
      Animated.timing(rocketX, { toValue: 15, duration: 100, useNativeDriver: false }),
      Animated.timing(rocketX, { toValue: -10, duration: 100, useNativeDriver: false }),
      Animated.timing(rocketX, { toValue: 10, duration: 100, useNativeDriver: false }),
      Animated.timing(rocketX, { toValue: 0, duration: 100, useNativeDriver: false }),
    ]).start(() => {
      // launch
      Animated.parallel([
        Animated.timing(rocketY, { toValue: -800, duration: 1200, easing: Easing.in(Easing.cubic), useNativeDriver: false }),
        Animated.timing(rocketRotate, { toValue: 10, duration: 1200, useNativeDriver: false }),
        Animated.timing(rocketOpacity, { toValue: 0, duration: 1200, delay: 400, useNativeDriver: false }),
      ]).start(() => {
        setShowRocket(false);
      });
    });
  };

  const triggerConfetti = () => {
    setShowConfetti(true);
    confettiAnim.setValue(0);
    Animated.timing(confettiAnim, { toValue: 1, duration: 2000, useNativeDriver: false }).start(() => {
      setShowConfetti(false);
    });
  };

  const handleClockIn = async () => {
    // request location and send with clock in
    let locationPayload: { latitude: number; longitude: number; label?: string } | undefined = undefined;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({});
        locationPayload = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } else {
        Alert.alert(t('locationPermissionDenied') || 'Location permission denied');
      }
    } catch (e) {
      // ignore location errors but alert user
      console.warn('Location error', e);
    }

    const success = await clockIn(locationPayload);
    if (success) {
      launchRocket();
      triggerConfetti();
    } else {
      Alert.alert(t('error'), error || t('failedToClockIn'));
    }
  };

  const handleClockOut = async () => {
    Alert.alert(
      t('clockOut'),
      t('confirmClockOut'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('clockOut'),
          onPress: async () => {
            // request location and send with clock out
            let locationPayload: { latitude: number; longitude: number; label?: string } | undefined = undefined;
            try {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status === 'granted') {
                const pos = await Location.getCurrentPositionAsync({});
                locationPayload = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
              } else {
                Alert.alert(t('locationPermissionDenied') || 'Location permission denied');
              }
            } catch (e) {
              console.warn('Location error', e);
            }

            const success = await clockOut(locationPayload);
            if (success) {
              triggerConfetti();
            } else {
              Alert.alert(t('error'), error || t('failedToClockOut'));
            }
          },
        },
      ]
    );
  };

  const formatDurationWithSeconds = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderCurrentStatus = () => {
    if (isLoading) {
      return (
        <Animated.View style={[styles.statusCard, { backgroundColor: 'rgba(255,255,255,0.95)', transform: [{ scale: statusCardAnim }] }]}>
          <Text style={[styles.statusText, { color: textColor, textAlign: rtlTextAlign }]}>
            {t('currentStatus')}: {t('loading')}
          </Text>
        </Animated.View>
      );
    }

    // combine transforms into a single style object so later style entries don't override earlier ones
    const statusTransforms: any[] = [{ scale: statusCardAnim }];
    if (currentSession) statusTransforms.push({ scale: pulseAnim });

    return (
      <Animated.View style={[
        styles.statusCard,
        { backgroundColor: 'rgba(255,255,255,0.95)', transform: statusTransforms,
          // use interpolated shadowOpacity only when clocked in; fall back to default otherwise
          shadowOpacity: currentSession ? glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.4] }) : 0.12
        }
      ]}>
        <View style={[styles.accentStripe, { backgroundColor: accentColor }]} />
        <Text style={[styles.statusLabel, { color: textColor, textAlign: rtlTextAlign }]}>
          {"🌞 " + (t('currentStatus') || 'Current status')}:
        </Text>
        <Text style={[
          styles.statusValue,
          { color: currentSession ? '#4CAF50' : '#F44336', textAlign: rtlTextAlign }
        ]}>
          {currentSession ? t('clockedIn') : t('clockedOut')}
        </Text>
        {currentSession && (
          <Text style={[styles.clockInTime, { color: textColor, textAlign: rtlTextAlign }]}>
            {t('clockedInAt')} {new Date(currentSession.clockIn).toLocaleTimeString()}
          </Text>
        )}
      </Animated.View>
    );
  };

  const renderTodayHours = () => {
    const totalMinutes = getTodayTotalHours();
    const liveTotalMinutes = currentSession ? totalMinutes + elapsedSeconds / 60 : totalMinutes;
    const totalHours = formatDuration(liveTotalMinutes);
    const progress = Math.min(liveTotalMinutes / 480, 1); // assuming 8 hours = 480 minutes

    return (
      <Animated.View style={[styles.hoursCard, { backgroundColor: 'rgba(255,255,255,0.95)', transform: [{ scale: hoursCardAnim }] }]}>
        <View style={[styles.accentStripeSmall, { backgroundColor: '#FFD166' }]} />
        <Text style={[styles.cardTitle, { color: textColor, textAlign: rtlTextAlign }]}>
          {"⏱️ " + (t('workingHoursToday') || 'Working hours today')}
        </Text>
        <Text style={[styles.totalHours, { color: textColor, textAlign: rtlTextAlign }]}>
          {totalHours}
        </Text>
        {currentSession ? (
          <Text style={[styles.currentSessionTimer, { color: textColor, textAlign: rtlTextAlign }]}>
            {t('currentSession') || 'Current session'}: {formatDurationWithSeconds(elapsedSeconds)}
          </Text>
        ) : null}

        <View style={styles.progressBarContainer}>
          <Animated.View style={[styles.progressBar, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
        <Text style={[styles.progressText, { color: textColor, textAlign: rtlTextAlign }]}>
          {Math.round(progress * 100)}% of 8h goal
        </Text>
      </Animated.View>
    );
  };

  const renderWorkHistory = () => {
    return (
      <Animated.View style={[styles.historyCard, { backgroundColor: 'rgba(255,255,255,0.95)', transform: [{ scale: historyCardAnim }] }]}>
        <Text style={[styles.cardTitle, { color: textColor, textAlign: rtlTextAlign }]}>
          {"📜 " + (t('workHistory') || 'Work history')}
        </Text>
        <ScrollView style={styles.historyList}>
          {todaySessions.length === 0 ? (
            <Text style={[styles.noHistory, { color: textColor, textAlign: rtlTextAlign }]}>
              {t('noWorkHistory')}
            </Text>
          ) : (
            todaySessions.map((session) => {
              const dateStr = new Date(session.clockIn).toLocaleDateString();
              const inTime = new Date(session.clockIn).toLocaleTimeString();
              const outTime = session.clockOut ? new Date(session.clockOut).toLocaleTimeString() : null;
              const durationStr = typeof session.duration === 'number' && session.duration > 0 ? formatDuration(session.duration) : null;

              const formatLoc = (loc: any, sessionId: string, type: 'clockIn' | 'clockOut') => {
                if (!loc) return '';
                if (loc.label) return String(loc.label);
                if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
                  const addr = addresses[sessionId]?.[type];
                  return addr || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`;
                }
                return '';
              };

              const clockInLocText = session.clockInLocation ? (formatLoc(session.clockInLocation, String(session._id), 'clockIn') || '') : '';
              const clockOutLocText = session.clockOutLocation ? (formatLoc(session.clockOutLocation, String(session._id), 'clockOut') || '') : '';

              return (
                <View key={String(session._id)} style={[styles.historyItem, { backgroundColor: '#fff' }]}>
                  <View style={[styles.historyHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.historyDate, { color: textColor, textAlign: rtlTextAlign }]}>{dateStr}</Text>
                    {durationStr ? <Text style={[styles.historyDuration, { color: '#4CAF50', textAlign: rtlTextAlign }]}>{durationStr}</Text> : null}
                  </View>

                  <Text style={[styles.historyTime, { color: textColor, textAlign: rtlTextAlign }]}>{`${t('in')} ${inTime}`}</Text>

                  {clockInLocText ? (
                    <Text style={[styles.historyTime, { color: '#666', textAlign: rtlTextAlign }]}>{`${t('location') || 'Location'}: ${clockInLocText}`}</Text>
                  ) : null}

                  {outTime ? (
                    <>
                      <Text style={[styles.historyTime, { color: textColor, textAlign: rtlTextAlign }]}>{`${t('out')} ${outTime}`}</Text>
                      {clockOutLocText ? (
                        <Text style={[styles.historyTime, { color: '#666', textAlign: rtlTextAlign }]}>{`${t('location') || 'Location'}: ${clockOutLocText}`}</Text>
                      ) : null}
                    </>
                  ) : (
                    <Text style={[styles.historyTime, { color: '#F44336', textAlign: rtlTextAlign }]}>{t('stillWorking')}</Text>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </Animated.View>
    );
  };

  return (
    <ScreenTemplate title={(t('workingHours') || 'Working hours') + ' ✨'}>
      <LinearGradient colors={['#FFF', '#667eea', '#FFF', '#764ba2', '#f093fb']} style={styles.container}>
        {/* Floating Emojis */}
        <Animated.Text style={[styles.floatingEmoji, { transform: [{ translateY: emoji1Anim }] }]}>⭐</Animated.Text>
        <Animated.Text style={[styles.floatingEmoji2, { transform: [{ translateY: emoji2Anim }] }]}>🎉</Animated.Text>
        <Animated.Text style={[styles.floatingEmoji3, { transform: [{ translateY: emoji3Anim }] }]}>✨</Animated.Text>
        <Animated.Text style={[styles.floatingEmoji4, { transform: [{ translateY: emoji4Anim }] }]}>🌈</Animated.Text>
        <Animated.Text style={[styles.floatingEmoji5, { transform: [{ translateY: emoji5Anim }] }]}>💫</Animated.Text>

        {/* Rocket Animation */}
        {showRocket && (
          <Animated.View style={[styles.rocket, {
            transform: [
              { translateY: rocketY },
              { translateX: rocketX },
              { rotate: rocketRotate.interpolate({ inputRange: [0, 10], outputRange: ['0deg', '10deg'] }) },
              { scale: rocketScale }
            ],
            opacity: rocketOpacity
          }]}>
            <Text style={styles.rocketEmoji}>🚀</Text>
            <Text style={styles.flameEmoji}>🔥</Text>
            <Text style={styles.sparkleEmoji}>✨</Text>
          </Animated.View>
        )}

        {/* Confetti Animation */}
        {showConfetti && (
          <Animated.View style={[styles.confettiContainer, { opacity: confettiAnim }]}>
            {Array.from({ length: 50 }).map((_, i) => (
              <Animated.Text key={i} style={[styles.confetti, {
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                color: ['#FFD700', '#FF69B4', '#00CED1', '#FF6347', '#32CD32'][Math.floor(Math.random() * 5)]
              }]}>
                {['🎉', '✨', '💫', '⭐', '🎊'][Math.floor(Math.random() * 5)]}
              </Animated.Text>
            ))}
          </Animated.View>
        )}

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          {renderCurrentStatus()}
          <View style={styles.buttonContainer}>
            {!currentSession ? (
              <Animated.View style={{ transform: [{ scale: scaleAnim }, { scale: buttonAnim }], alignSelf: 'stretch' }}>
                <LinearGradient colors={['#4CAF50', '#66BB6A', '#81C784']} style={styles.clockInButton}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPressIn={animatePressIn}
                    onPressOut={animatePressOut}
                    style={styles.buttonTouchable}
                    onPress={handleClockIn}
                  >
                    <Text style={styles.buttonText}>🚀 {t('clockIn')}</Text>
                    <Animated.View style={[styles.shimmer, { opacity: shimmerAnim }]} />
                  </TouchableOpacity>
                </LinearGradient>
              </Animated.View>
            ) : (
              <Animated.View style={{ transform: [{ scale: scaleAnim }, { scale: buttonAnim }], alignSelf: 'stretch' }}>
                <LinearGradient colors={['#F44336', '#EF5350', '#E57373']} style={styles.clockOutButton}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPressIn={animatePressIn}
                    onPressOut={animatePressOut}
                    style={styles.buttonTouchable}
                    onPress={handleClockOut}
                  >
                    <Text style={styles.buttonText}>🎊 {t('clockOut')}</Text>
                    <Animated.View style={[styles.shimmer, { opacity: shimmerAnim }]} />
                  </TouchableOpacity>
                </LinearGradient>
              </Animated.View>
            )}
          </View>

          {renderTodayHours()}
          {renderWorkHistory()}
        </ScrollView>
      </LinearGradient>
    </ScreenTemplate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  statusCard: {
    padding: 20,
    borderRadius: 14,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
    width: '100%',
  },
  accentStripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 6,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  accentStripeSmall: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 0,
    height: 6,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  clockInTime: {
    fontSize: 14,
    opacity: 0.8,
  },
  buttonContainer: {
    marginBottom: 30,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  clockInButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
    width: '100%'
  },
  clockOutButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
    width: '100%'
  },
  buttonTouchable: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  },
  hoursCard: {
    padding: 20,
    borderRadius: 14,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    width: '100%',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  totalHours: {
    fontSize: 28,
    fontWeight: '900',
  },
  currentSessionTimer: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 10,
  },
  progressBarContainer: {
    height: 8,
    width: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    marginTop: 4,
  },
  historyCard: {
    padding: 20,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    width: '100%',
  },
  historyList: {
    maxHeight: 260,
  },
  noHistory: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.6,
  },
  historyItem: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)'
  },
  historyTime: {
    fontSize: 14,
    marginBottom: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyDuration: {
    fontSize: 14,
    fontWeight: '700',
  },
  floatingEmoji: {
    position: 'absolute',
    top: 50,
    left: 30,
    fontSize: 24,
    opacity: 0.8,
    zIndex: 1000,
  },
  floatingEmoji2: {
    position: 'absolute',
    top: 100,
    right: 40,
    fontSize: 24,
    opacity: 0.8,
    zIndex: 1000,
  },
  floatingEmoji3: {
    position: 'absolute',
    bottom: 200,
    left: 50,
    fontSize: 24,
    opacity: 0.8,
    zIndex: 1000,
  },
  floatingEmoji4: {
    position: 'absolute',
    top: 150,
    left: 70,
    fontSize: 24,
    opacity: 0.8,
    zIndex: 1000,
  },
  floatingEmoji5: {
    position: 'absolute',
    bottom: 100,
    right: 70,
    fontSize: 24,
    opacity: 0.8,
    zIndex: 1000,
  },
  rocket: {
    position: 'absolute',
    bottom: 100,
    right: 50,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  rocketEmoji: {
    fontSize: 32,
  },
  flameEmoji: {
    position: 'absolute',
    top: 10,
    fontSize: 16,
    color: '#FF4500',
  },
  sparkleEmoji: {
    position: 'absolute',
    top: -10,
    fontSize: 16,
    color: '#FFD700',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  confetti: {
    position: 'absolute',
    fontSize: 18,
    opacity: 0.9,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
  },
});
