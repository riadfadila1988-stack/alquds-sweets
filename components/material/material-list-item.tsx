import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, Easing } from 'react-native';
import { IMaterial } from '@/types/material';
import { useTranslation } from '@/app/_i18n';
import { Ionicons } from '@expo/vector-icons';

export default function MaterialListItem({ item, onPress, onLongPress, compact }: { item: IMaterial; onPress?: () => void; onLongPress?: () => void; compact?: boolean }) {
  const { t } = useTranslation();
  const isLow = typeof item.quantity === 'number' && typeof item.notificationThreshold === 'number' && item.quantity <= item.notificationThreshold;
  const unitLabel = item.unit ? (t(('unit_' + item.unit) as any) ?? item.unit) : '';

  const costLabel = typeof item.cost === 'number' ? Number(item.cost).toFixed(2) : undefined;
  const minQtyLabel = typeof item.notificationThreshold === 'number' ? String(item.notificationThreshold) : undefined;
  const updatedLabel = item.updatedAt ? new Date(item.updatedAt).toLocaleString() : undefined;

  // detect RTL dynamically
  const isRTL = true;

  // animated press scale
  const scale = useRef(new Animated.Value(1)).current;
  // subtle icon animation (applies to the cube icon)
  const iconAnim = useRef(new Animated.Value(0)).current;
  // mount animations
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(6)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  // start icon pulse/rotation
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(iconAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(iconAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    try { loop.start(); } catch { Animated.timing(iconAnim, { toValue: 1, duration: 1800, useNativeDriver: true }).start(); }
    return () => loop.stop();
  }, [iconAnim]);

  const onPressIn = () => {
    Animated.spring(scale, { toValue: 0.985, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
  };

  // pulsing animation for low badge
  const lowScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (isLow) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(lowScale, { toValue: 1.06, duration: 700, useNativeDriver: true }),
          Animated.timing(lowScale, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      anim.start();
    }
    return () => { if (anim) anim.stop(); };
  }, [isLow, lowScale]);

  // deterministic variant selection so each card gets a different animation (consistent across renders)
  const VARIANTS = ['float', 'wiggle', 'pulseScale', 'rotate', 'bounce'];
  const variantIndex = useMemo(() => {
    const seed = (item._id ?? item.name ?? '').toString();
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return h % VARIANTS.length;
  }, [item._id, item.name, VARIANTS.length]);
  const variant = VARIANTS[variantIndex];

  // variant animation driver
  const variantAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    switch (variant) {
      case 'float':
        variantAnim.setValue(0);
        anim = Animated.loop(
          Animated.sequence([
            Animated.timing(variantAnim, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(variantAnim, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ])
        );
        break;
      case 'wiggle':
        variantAnim.setValue(0);
        anim = Animated.loop(
          Animated.sequence([
            Animated.timing(variantAnim, { toValue: 1, duration: 350, easing: Easing.linear, useNativeDriver: true }),
            Animated.timing(variantAnim, { toValue: -1, duration: 350, easing: Easing.linear, useNativeDriver: true }),
            Animated.timing(variantAnim, { toValue: 0, duration: 350, easing: Easing.linear, useNativeDriver: true }),
          ])
        );
        break;
      case 'pulseScale':
        variantAnim.setValue(0);
        anim = Animated.loop(
          Animated.sequence([
            Animated.timing(variantAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(variantAnim, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          ])
        );
        break;
      case 'rotate':
        variantAnim.setValue(0);
        anim = Animated.loop(Animated.timing(variantAnim, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true }));
        break;
      case 'bounce':
        variantAnim.setValue(0);
        anim = Animated.loop(
          Animated.sequence([
            Animated.timing(variantAnim, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(variantAnim, { toValue: 0, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: true }),
            Animated.delay(600),
          ])
        );
        break;
      default:
        break;
    }
    if (anim) anim.start();
    return () => { if (anim) anim.stop(); };
  }, [variant, variantAnim]);

  // derive transform style for the variant to apply on the card container
  const variantTransform = useMemo(() => {
    switch (variant) {
      case 'float':
        return [{ translateY: variantAnim.interpolate({ inputRange: [0,1], outputRange: [0,-6] }) }];
      case 'wiggle':
        return [{ rotate: variantAnim.interpolate({ inputRange: [-1,1], outputRange: ['-3deg', '3deg'] }) }];
      case 'pulseScale':
        return [{ scale: variantAnim.interpolate({ inputRange: [0,1], outputRange: [1, 1.035] }) }];
      case 'rotate':
        return [{ rotate: variantAnim.interpolate({ inputRange: [0,1], outputRange: ['0deg', '360deg'] }) }];
      case 'bounce':
        return [{ translateY: variantAnim.interpolate({ inputRange: [0,1], outputRange: [0, -10] }) }];
      default:
        return [];
    }
  }, [variant, variantAnim]);

  // displayed name includes heName when present
  const displayedName = `${item.name}${item.heName ? ' | ' + item.heName : ''}`;

  const accentColor = isLow ? '#ff8c42' : '#0a7ea4';

  const accessibilityLabel = `${displayedName}${item.quantity !== undefined ? ', ' + (item.quantity + (unitLabel ? ' ' + unitLabel : '')) : ''}`;

  return (
    <Animated.View style={[styles.wrapper, { opacity, transform: [{ translateY }, { scale }] } as any]}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        onLongPress={onLongPress}
        android_ripple={{ color: 'rgba(0,0,0,0.04)' }}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={styles.cardRow}>
          <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

          <Animated.View style={[styles.card, compact ? styles.cardCompact : null, isRTL ? styles.cardRtl : null]}>
            <View style={styles.leftCol}>
              <Animated.View style={[
                styles.iconWrap,
                { backgroundColor: accentColor + '14', transform: [
                  { scale: iconAnim.interpolate({ inputRange: [0,1], outputRange: [0.98, 1.06] }) },
                  { rotate: iconAnim.interpolate({ inputRange: [0,1], outputRange: ['0deg','6deg'] }) },
                  // apply variant-specific transforms to the icon only
                  ...variantTransform,
                ] },
              ]}>
                <Ionicons name="cube-outline" size={20} color={accentColor} />
              </Animated.View>
            </View>

            <View style={styles.centerCol}>
              <Text numberOfLines={2} style={[styles.name, isRTL ? styles.textRight : null]}>{displayedName}</Text>

              <View style={[styles.metaRow, isRTL ? styles.metaRowRtl : null]}>
                {minQtyLabel ? (
                  <View style={styles.pill}>
                    <Ionicons name="alert-circle-outline" size={14} color="#475569" style={styles.icon} />
                    <Text style={styles.pillText}>{t('minQuantity') || 'Min'}: {minQtyLabel}</Text>
                  </View>
                ) : null}

                {costLabel ? (
                  <View style={styles.pill}>
                    <Ionicons name="cash-outline" size={14} color="#475569" style={styles.icon} />
                    <Text style={styles.pillText}>{t('cost') || 'Cost'}: {new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(costLabel))}</Text>
                  </View>
                ) : null}

                {updatedLabel ? (
                  <View style={styles.pill}>
                    <Ionicons name="time-outline" size={14} color="#475569" style={styles.icon} />
                    <Text style={[styles.updatedText, isRTL ? styles.infoTextRTL : null]} numberOfLines={1}>{updatedLabel}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={[styles.rightCol, isRTL ? styles.rightColRtl : null]}>
              {(item.quantity !== undefined || item.unit) && (
                <Animated.View style={[styles.quantityWrap, { transform: [{ scale: scale }] }]}>
                  <Text style={styles.quantity}>{`${item.quantity ?? ''}${unitLabel ? ' ' + unitLabel : ''}`}</Text>
                </Animated.View>
              )}

              {isLow && (
                <Animated.View style={[styles.lowBadge, { transform: [{ scale: lowScale }] }]}>
                  <Text style={styles.lowBadgeText}>{t('low') || 'Low'}</Text>
                </Animated.View>
              )}
            </View>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'stretch' },
  accentBar: { width: 6, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
  card: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#ffffffee',
    borderRadius: 12,
    padding: 12,
    marginLeft: 8,
    marginRight: 0,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  // compact variant: don't stretch, size to content
  cardCompact: {
    flex: 0,
    alignSelf: 'flex-start',
    marginLeft: 8,
    marginRight: 0,
  },
  cardRtl: { marginLeft: 8, marginRight: 0, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
  leftCol: { width: 44, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(10,126,164,0.08)', alignItems: 'center', justifyContent: 'center' },
  centerCol: { flex: 1, paddingHorizontal: 8 },
  name: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
  metaRowRtl: { flexDirection: 'row-reverse' },
  pill: { backgroundColor: 'rgba(15,23,42,0.04)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8, marginTop: 4, flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 4 },
  pillText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  updatedText: { fontSize: 12, color: '#94a3b8', marginLeft: 8, marginTop: 4 },
  infoTextRTL: { marginLeft: 0, marginRight: 8 },
  rightCol: { alignItems: 'flex-end', justifyContent: 'center', width: 92 },
  rightColRtl: { alignItems: 'flex-start' },
  quantity: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  quantityWrap: { overflow: 'hidden', borderRadius: 12, backgroundColor: 'rgba(10,126,164,0.08)', padding: 4, marginTop: 4 },
  lowBadge: { marginTop: 8, backgroundColor: '#ff8c42', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  lowBadgeText: { color: '#fff', fontWeight: '800' },
  textRight: { textAlign: 'right' },
});
