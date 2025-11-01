import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

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
  const dbg = () => {};

  const isRunning = typeof isRunningProp === 'boolean' ? isRunningProp : true;

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

  // --- Speedometer UI implementation ---
  // size: try to pick a sensible size from provided style.width/height or default
  const sizeFromStyle = (() => {
    const s = (style as any) || {};
    return s.width || s.height || 160;
  })();
  const size = typeof sizeFromStyle === 'number' ? sizeFromStyle : 160;
  const radius = size / 2;

  // percent of remaining time (clamped 0..1). If initialSeconds is 0 use 0.
  const initial = initialSecondsRef.current || 0;
  const percent = initial > 0 ? Math.max(0, Math.min(1, secondsRemaining / initial)) : 0;

  // Map percent to angle sweep for the needle. Speedometer sweep: -120deg .. +120deg
  // For a half-circle speedometer use -90..+90 (top semicircle)
  const angleMin = -90;
  const angleMax = 90;
  const needleAngle = angleMin + percent * (angleMax - angleMin);

  // ticks generation (major ticks)
  const ticks = Array.from({ length: 13 }).map((_, i) => {
    // from -120 to +120
    return angleMin + (i / 12) * (angleMax - angleMin);
  });

  // choose a gauge/border color based on percent remaining
  const gaugeColor = percent > 0.66 ? '#4CAF50' : percent > 0.33 ? '#FFC107' : '#E74C3C';
  const borderWidth = 8;

  return (
    <View style={[styles.container, { width: size, height: size }, style] as any}>
      {/* Clip wrapper to show only the top half of a full circle */}
      <View style={{ width: size, height: radius, overflow: 'hidden', position: 'absolute', left: 0, top: 0 }}>
        {/* Base circle (light border) - visible only top half via clipping */}
        <View style={[styles.circle, { width: size, height: size, borderRadius: radius }]} />

        {/* Colored border arc overlay: clip a full bordered circle and reveal a portion by width */}
        <View
          style={[
            {
              position: 'absolute',
              left: 0,
              top: 0,
              height: radius,
              width: Math.max(0, Math.min(size, percent * size)),
              overflow: 'hidden',
            },
          ]}
        >
          <View
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: radius,
              borderWidth,
              borderColor: gaugeColor,
              backgroundColor: 'transparent',
            }}
          />
        </View>

        {/* Ticks inside the clipped area (only top half will be visible) */}
        {ticks.map((angle, idx) => {
          const tickLength = idx % 3 === 0 ? 14 : 8;
          const tickWidth = idx % 3 === 0 ? 3 : 2;
          const transform = [
            { rotate: `${angle}deg` },
            { translateY: -radius + 12 },
          ];
          return (
            <View key={String(idx)} style={[styles.tickContainer, { width: size, height: size, left: 0, top: 0 }]}>
              <View
                style={{
                  position: 'absolute',
                  left: size / 2 - tickWidth / 2,
                  top: size / 2 - tickLength / 2,
                  width: tickWidth,
                  height: tickLength,
                  backgroundColor: '#444',
                  borderRadius: 2,
                  transform,
                }}
              />
            </View>
          );
        })}
      </View>

      {/* Needle - positioned over the clipped dial. We rotate around the bottom of the needle
          so it pivots at the circle center (which is at y = radius). */}
      <View style={[styles.needleContainer, { width: size, height: size }] as any} pointerEvents="none">
        {
          (() => {
            const needleHeight = Math.max(8, radius - 18);
            const half = needleHeight / 2;
            // place the needle so its bottom aligns with the circle center (y = radius)
            const top = radius - needleHeight;
            return (
              <View
                style={[
                  styles.needle,
                  {
                    height: needleHeight,
                    left: size / 2 - 2,
                    top,
                    transform: [
                      { translateY: half },
                      { rotate: `${needleAngle}deg` },
                      { translateY: -half },
                    ],
                  },
                ]}
              />
            );
          })()
        }
        {/* center cap at the circle center */}
        <View style={[styles.centerCap, { left: size / 2 - 10, top: radius - 10 }]} />
      </View>

      {/* Center time readout placed inside the visible semicircle (vertically centered in the top half) */}
      <View style={[styles.centerTextContainer, { width: size, height: radius, top: 0, left: 0 } as any]} pointerEvents="none">
        <Text style={[styles.text, textStyle]}>{toClock(secondsRemaining)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 20,
    fontWeight: '600',
  },
  circle: {
    position: 'absolute',
    borderWidth: 8,
    borderColor: '#ddd',
    borderRadius: 80,
  },
  tickContainer: {
    position: 'absolute',
    width: 160,
    height: 160,
    left: 0,
    top: 0,
  },
  needleContainer: {
    position: 'absolute',
    width: 160,
    height: 160,
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  needle: {
    position: 'absolute',
    width: 4,
    backgroundColor: '#e74c3c',
    top: 0,
    left: 0,
    borderRadius: 2,
  },
  centerCap: {
    position: 'absolute',
    width: 20,
    height: 20,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: '#e74c3c',
    borderRadius: 10,
  },
  centerTextContainer: {
    position: 'absolute',
    width: 160,
    height: 160,
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Memoize the Timer to avoid re-rendering when parent passes new callback identities
export default React.memo(Timer);
