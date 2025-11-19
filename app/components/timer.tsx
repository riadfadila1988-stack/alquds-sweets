import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export type TimerProps = {
  /** initial time in minutes (can be fractional, can be negative) */
  minutes: number;
  /** optional start time (Date|string|ms) used to compute remaining = duration - elapsed */
  startedAt?: string | number | Date | null;
  /** optional key that forces a reset when it changes (e.g. task.startTime) */
  resetKey?: string | number | null;
  /** if provided, controls running state (true = running). If undefined, timer auto-starts. */
  isRunning?: boolean;
  /** called every second with seconds remaining (can be negative) */
  onTick?: (secondsRemaining: number) => void;
  /** called once when the timer first reaches exactly 0 seconds */
  onComplete?: () => void;
  /** allow timer to keep going below zero (default true) */
  allowNegative?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

/**
 * Timer component
 * - Accepts `minutes` (number). Displays as MM:SS and counts down each second.
 * - If `allowNegative` is true (default) the timer keeps counting past 0 into negative values and displays a leading '-'.
 * - Callbacks: `onTick(secondsRemaining)` each second, `onComplete()` when it first reaches 0.
 *
 * Usage example:
 * <Timer minutes={5} onTick={(s) => console.log(s)} onComplete={() => alert('done')} />
 */
const Timer: React.FC<TimerProps> = ({
  minutes,
  resetKey,
  isRunning: isRunningProp,
  onTick,
  onComplete,
  allowNegative = true,
  style,
  textStyle,
  startedAt,
}) => {
  // Convert minutes to integer seconds
  const toSeconds = (m: number) => Math.round(m * 60);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(toSeconds(minutes));
  // Keep the initial seconds so we can compute percent remaining for the gauge
  const initialSecondsRef = useRef<number>(toSeconds(minutes));
  const hasCompletedRef = useRef<boolean>(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 🎨 SUPER MODERN ANIMATION SYSTEM 🎨
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const particlesAnim = useRef<Animated.Value[]>([]);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Initialize particle animations (30 particles for ambient effect)
  if (particlesAnim.current.length === 0) {
    particlesAnim.current = Array.from({ length: 30 }, () => new Animated.Value(0));
  }

  // Keep refs to callback props so their changing identity doesn't retrigger effects
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Stabilize onTick as well so its identity changing doesn't cause extra effect work
  const onTickRef = useRef(onTick);
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  // Debug helper (DEV only)
  const dbg = (...args: any[]) => {
    try {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('[Timer]', ...args);
      }
    } catch {}
  };

  const isRunning = typeof isRunningProp === 'boolean' ? isRunningProp : true;

  // 🎬 Start continuous animations when running
  useEffect(() => {
    if (!isRunning) return;

    // Pulse animation - heartbeat effect
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Glow animation - breathing glow effect
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );

    // Rotation animation - spinning gradient ring
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Shimmer animation - light sweep effect
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(1000),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    // Particle animations - ambient floating particles
    const particleAnims = particlesAnim.current.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 100),
          Animated.timing(anim, {
            toValue: 1,
            duration: 3000 + Math.random() * 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      )
    );

    pulse.start();
    glow.start();
    rotate.start();
    shimmer.start();
    particleAnims.forEach(p => p.start());

    return () => {
      pulse.stop();
      glow.stop();
      rotate.stop();
      shimmer.stop();
      particleAnims.forEach(p => p.stop());
    };
  }, [isRunning, pulseAnim, glowAnim, rotateAnim, shimmerAnim]);

  // keep previous values to detect real changes (avoid object-identity-only changes)
  const prevMinutesRef = useRef<number | null>(null);
  const prevResetKeyRef = useRef<any>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset when minutes, resetKey or startedAt change
  useEffect(() => {
    const durationSec = toSeconds(minutes);

    dbg('reset effect run', { minutes, durationSec, prevInitial: initialSecondsRef.current, resetKey, startedAt });

    const durationChanged = prevMinutesRef.current !== durationSec;
    const resetKeyChanged = prevResetKeyRef.current !== resetKey;

    // store current for next comparison
    prevMinutesRef.current = durationSec;
    prevResetKeyRef.current = resetKey;

    if (!durationChanged && !resetKeyChanged) {
      dbg('reset: no change detected, skipping');
      return;
    }

    // ensure initialSecondsRef stores the full duration (not remaining)
    if (initialSecondsRef.current !== durationSec) {
      initialSecondsRef.current = durationSec;
      hasCompletedRef.current = false;
      dbg('reset: initialSecondsRef updated', durationSec);
    }

    // compute remaining: if startedAt provided, subtract elapsed; otherwise default to full duration
    let nextRemaining = durationSec;
    // (previous code checked `arguments[2]` as a noop for linting; removed because
    // `arguments` is not available/recognized here and causes TS2304)
    try {
      if (startedAt) {
        const startedAtMs = new Date(startedAt as any).getTime();
        const elapsed = Math.floor((Date.now() - startedAtMs) / 1000);
        nextRemaining = durationSec - elapsed;
      }
    } catch {
      // ignore invalid startedAt
    }

    // schedule the state update on next tick to avoid synchronous render loops
    if (resetTimeoutRef.current !== null) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
    const next = nextRemaining;
    resetTimeoutRef.current = setTimeout(() => {
      setSecondsRemaining((prev) => {
        dbg('reset: setSecondsRemaining updater run', { prev, next });
        return prev === next ? prev : next;
      });
      resetTimeoutRef.current = null;
    }, 0);

    return () => {
      if (resetTimeoutRef.current !== null) {
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }
    };
  }, [minutes, resetKey, startedAt]);

  // Tick effect
  useEffect(() => {
    // clear any existing interval
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!isRunning) return;

    dbg('interval create');
    intervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        const next = prev - 1;

        // trigger onComplete when we transition to 0 (from >0 to 0)
        if (prev > 0 && next === 0 && !hasCompletedRef.current) {
          hasCompletedRef.current = true;
          try {
            // call the stable ref to avoid effect retriggers
            onCompleteRef.current && onCompleteRef.current();
            dbg('onComplete triggered');
          } catch {
            // swallow errors from callbacks
          }
        }

        // if not allowing negative and next < 0, stop at 0
        if (!allowNegative && next < 0) {
          dbg('tick update clamped to 0');
          return 0;
        }

        // debug occasional tick progress (coarsely)
        if (next % 10 === 0) dbg('tick', { prev, next });
        return next;
      });
    }, 1000);

    return () => {
      dbg('interval clear');
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, allowNegative]);

  // call onTick whenever secondsRemaining changes (use ref to avoid depending on callback identity)
  useEffect(() => {
    try {
      onTickRef.current && onTickRef.current(secondsRemaining);
      dbg('onTick fired', secondsRemaining);
    } catch {
      // ignore
    }
  }, [secondsRemaining]);

  // formatting
  const toClock = (secs: number) => {
    const sign = secs < 0 ? '-' : '';
    const abs = Math.abs(secs);
    const mm = Math.floor(abs / 60);
    const ss = Math.abs(secs) % 60;
    const mmStr = String(mm).padStart(2, '0');
    const ssStr = String(ss).padStart(2, '0');
    return `${sign}${mmStr}:${ssStr}`;
  };

  // --- SUPER MODERN SPEEDOMETER UI WITH AMAZING ANIMATIONS ---
  const sizeFromStyle = (() => {
    const s = (style as any) || {};
    return s.width || s.height || 160;
  })();
  const size = typeof sizeFromStyle === 'number' ? sizeFromStyle : 160;
  const radius = size / 2;

  // percent of remaining time (clamped 0..1)
  const initial = initialSecondsRef.current || 0;
  const percent = initial > 0 ? Math.max(0, Math.min(1, secondsRemaining / initial)) : 0;

  // Dynamic color theme based on time remaining
  const getColorTheme = () => {
    if (percent > 0.66) {
      return {
        primary: ['#00F260', '#0575E6'] as const,
        secondary: ['#00D4FF', '#090979'] as const,
        glow: '#00F260',
        ring: ['#00F260', '#0575E6', '#00D4FF'] as const,
        text: '#00F260',
      };
    } else if (percent > 0.33) {
      return {
        primary: ['#FDC830', '#F37335'] as const,
        secondary: ['#FFD700', '#FF8C00'] as const,
        glow: '#FDC830',
        ring: ['#FDC830', '#F37335', '#FFD700'] as const,
        text: '#FDC830',
      };
    } else {
      return {
        primary: ['#FF416C', '#FF4B2B'] as const,
        secondary: ['#FF6B9D', '#FFA07A'] as const,
        glow: '#FF416C',
        ring: ['#FF416C', '#FF4B2B', '#FF6B9D'] as const,
        text: '#FF416C',
      };
    }
  };

  const theme = getColorTheme();

  // Needle angle for speedometer
  const angleMin = -90;
  const angleMax = 90;
  const needleAngle = angleMin + percent * (angleMax - angleMin);

  // Animated interpolations
  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.9],
  });

  const glowOpacitySubtle = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.45],
  });

  const rotateValue = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-size * 2, size * 2],
  });

  // Render particles
  const renderParticles = () => {
    return particlesAnim.current.map((anim, i) => {
      const angle = (i / particlesAnim.current.length) * Math.PI * 2;
      const distance = radius * 0.7;
      const startX = Math.cos(angle) * distance;
      const startY = Math.sin(angle) * distance;

      const translateX = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [startX, startX + Math.cos(angle) * 30],
      });

      const translateY = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [startY, startY + Math.sin(angle) * 30],
      });

      const opacity = anim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0.6, 0],
      });

      const scale = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      });

      return (
        <Animated.View
          key={`particle-${i}`}
          style={{
            position: 'absolute',
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: theme.glow,
            left: radius,
            top: radius,
            opacity,
            transform: [
              { translateX },
              { translateY },
              { scale },
            ],
          }}
        />
      );
    });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          transform: [{ scale: pulseScale }],
        },
        style
      ] as any}
    >
      {/* Outer glow effect */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size + 40,
          height: size + 40,
          left: -20,
          top: -20,
          borderRadius: (size + 40) / 2,
          opacity: glowOpacity,
          shadowColor: theme.glow,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 20,
          elevation: 10,
        }}
      />

      {/* Rotating gradient ring */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size + 20,
          height: size + 20,
          left: -10,
          top: -10,
          transform: [{ rotate: rotateValue }],
        }}
      >
        <LinearGradient
          colors={theme.ring}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: size + 20,
            height: size + 20,
            borderRadius: (size + 20) / 2,
            opacity: 0.3,
          }}
        />
      </Animated.View>

      {/* Main container background with gradient */}
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: radius,
        }}
      />

      {/* Particles layer */}
      <View style={{ position: 'absolute', width: size, height: size }} pointerEvents="none">
        {renderParticles()}
      </View>

      {/* Speedometer gauge - clipped to top half */}
      <View style={{ width: size, height: radius, overflow: 'hidden', position: 'absolute', left: 0, top: 0 }}>
        {/* Base arc - gray rounded track */}
        <View
          style={{
            position: 'absolute',
            width: size - 24,
            height: size - 24,
            left: 12,
            top: 12,
            borderRadius: (size - 24) / 2,
            borderWidth: 12,
            borderColor: '#2d2d44',
            backgroundColor: 'transparent',
          }}
        />

        {/* Progress arc - animated colored bar that fills */}
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: radius,
            width: Math.max(0, Math.min(size, percent * size)),
            overflow: 'hidden',
          }}
        >
          {/* Gradient wrapper for the progress border */}
          <View
            style={{
              position: 'absolute',
              width: size,
              height: size,
            }}
          >
            {/* Inner container to hold gradient border */}
            <View style={{ width: size, height: size, borderRadius: radius }}>
              <LinearGradient
                colors={theme.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  position: 'absolute',
                  width: size - 24,
                  height: size - 24,
                  left: 12,
                  top: 12,
                  borderRadius: (size - 24) / 2,
                  borderWidth: 12,
                  borderColor: 'transparent',
                }}
              />
            </View>

            {/* Glowing overlay */}
            <Animated.View
              style={{
                position: 'absolute',
                width: size - 24,
                height: size - 24,
                left: 12,
                top: 12,
                borderRadius: (size - 24) / 2,
                borderWidth: 12,
                borderColor: theme.glow,
                backgroundColor: 'transparent',
                opacity: glowOpacitySubtle,
              }}
            />
          </View>
        </Animated.View>

        {/* Enhanced tick marks with glow */}
        {Array.from({ length: 13 }).map((_, i) => {
          const angle = angleMin + (i / 12) * (angleMax - angleMin);
          const tickLength = i % 3 === 0 ? 16 : 10;
          const tickWidth = i % 3 === 0 ? 3 : 2;
          const isActive = percent >= (i / 12);

          return (
            <View key={`tick-${i}`} style={[styles.tickContainer, { width: size, height: size }]}>
              <LinearGradient
                colors={isActive ? theme.primary : ['#444', '#666']}
                style={{
                  position: 'absolute',
                  left: size / 2 - tickWidth / 2,
                  top: size / 2 - tickLength / 2,
                  width: tickWidth,
                  height: tickLength,
                  borderRadius: 2,
                  transform: [
                    { rotate: `${angle}deg` },
                    { translateY: -radius + 18 },
                  ],
                  shadowColor: isActive ? theme.glow : 'transparent',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 4,
                }}
              />
            </View>
          );
        })}
      </View>

      {/* Animated needle with glow effect */}
      <View style={[styles.needleContainer, { width: size, height: size }]} pointerEvents="none">
        <Animated.View
          style={{
            position: 'absolute',
            width: 6,
            height: radius - 25,
            left: size / 2 - 3,
            top: 25,
            borderRadius: 3,
            transform: [
              { translateY: (radius - 25) / 2 },
              { rotate: `${needleAngle}deg` },
              { translateY: -(radius - 25) / 2 },
            ],
          }}
        >
          <LinearGradient
            colors={theme.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              flex: 1,
              borderRadius: 3,
              shadowColor: theme.glow,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: 8,
              elevation: 5,
            }}
          />
        </Animated.View>

        {/* Glowing center cap */}
        <Animated.View
          style={[
            styles.centerCap,
            {
              left: size / 2 - 12,
              top: radius - 12,
              backgroundColor: theme.glow,
              borderColor: theme.primary[0],
              borderWidth: 3,
              shadowColor: theme.glow,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: glowOpacity,
              shadowRadius: 10,
              elevation: 8,
            }
          ]}
        />
      </View>

      {/* Shimmer effect overlay */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: size / 2,
          height: size,
          left: 0,
          top: 0,
          opacity: 0.3,
          transform: [{ translateX: shimmerTranslate }],
        }}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* Time display with modern typography */}
      <View style={[styles.centerTextContainer, { width: size, height: size }]} pointerEvents="none">
        <LinearGradient
          colors={theme.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingHorizontal: 20,
            paddingVertical: 8,
            borderRadius: 20,
            marginTop: radius * 0.3,
          }}
        >
          <Text
            style={[
              styles.text,
              textStyle,
              {
                color: '#fff',
                fontSize: Math.max(20, size / 6),
                fontWeight: '800',
                letterSpacing: 2,
                textShadowColor: theme.glow,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 10,
              }
            ]}
          >
            {toClock(secondsRemaining)}
          </Text>
        </LinearGradient>

        {/* Status indicator text */}
        <Text
          style={{
            color: theme.text,
            fontSize: Math.max(10, size / 16),
            fontWeight: '600',
            marginTop: 8,
            opacity: 0.8,
            letterSpacing: 1,
          }}
        >
          {percent > 0.66 ? '● ON TRACK' : percent > 0.33 ? '● HURRY UP' : '● OVERTIME'}
        </Text>
      </View>

      {/* Percentage indicator */}
      <View
        style={{
          position: 'absolute',
          bottom: 10,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}
      >
        <LinearGradient
          colors={theme.secondary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 12,
            opacity: 0.9,
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: Math.max(10, size / 14),
              fontWeight: '700',
              letterSpacing: 1,
            }}
          >
            {Math.round(percent * 100)}%
          </Text>
        </LinearGradient>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  text: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  circle: {
    position: 'absolute',
    borderWidth: 12,
    borderColor: 'transparent',
  },
  tickContainer: {
    position: 'absolute',
  },
  needleContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  needle: {
    position: 'absolute',
    borderRadius: 3,
  },
  centerCap: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  centerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Memoize the Timer to avoid re-rendering when parent passes new callback identities
export default React.memo(Timer);
