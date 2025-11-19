import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../_i18n';
import { LinearGradient } from 'expo-linear-gradient';

type HeaderProps = {
  title?: string;
  titleKey?: string; // optional i18n key to translate
  subtitle?: string; // optional second line (e.g., user name)
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
};

export default function Header({ title, titleKey, subtitle, showBack = true, onBack, right }: HeaderProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isRTL = true;

  // Animation for header entrance
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleBack = () => {
    if (onBack) return onBack();
    try {
      router.back();
    } catch (e) {
      console.warn('Header back navigation failed', e);
    }
  };

  return (
    <View style={styles.stickyWrapper}>
      <Animated.View
        style={{
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        }}
      >
        <LinearGradient
          colors={['#02632D', '#048B3D', '#06A34E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.container, { paddingTop: (insets.top || 12) + 8 }]}
        >
        {/* Decorative background elements */}
        <View style={styles.decoCircleTop} />
        <View style={styles.decoCircleBottom} />

        <View style={styles.row}>
          {!isRTL ? (
            showBack ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('back') || 'Back'}
                onPress={handleBack}
                style={styles.backBtn}
                activeOpacity={0.7}
              >
                <View style={styles.backBtnCircle}>
                  <Ionicons name="chevron-back" size={24} color="#02632D" style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.backBtnPlaceholder} />
            )
          ) : (
            <View style={styles.backBtnPlaceholder} />
          )}

          <View style={styles.titleWrap}>
            {(titleKey) ? (
              <Text numberOfLines={1} style={styles.title}>
                {t((titleKey as any) || '')}
              </Text>
            ) : title ? (
              <Text numberOfLines={1} style={styles.title}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <View style={styles.subtitleContainer}>
                <Ionicons name="person-circle-outline" size={14} color="rgba(255,255,255,0.9)" style={{ marginRight: 4 }} />
                <Text numberOfLines={1} style={styles.subtitle}>
                  {subtitle}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.rightWrap}>
            {isRTL && showBack ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('back') || 'Back'}
                onPress={handleBack}
                style={styles.backBtn}
                activeOpacity={0.7}
              >
                <View style={styles.backBtnCircle}>
                  <Ionicons name="chevron-back" size={24} color="#02632D" style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
                </View>
              </TouchableOpacity>
            ) : null}
            {right ?? <View style={styles.rightPlaceholder} />}
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Make the header participate in normal layout instead of absolutely positioning it.
  // This prevents the header from overlapping and hiding the underlying content.
  stickyWrapper: {
    position: 'relative',
    width: '100%',
    zIndex: 1000,
  },
  container: {
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#02632D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    position: 'relative',
    overflow: 'hidden',
    zIndex: 1000,
  },
  decoCircleTop: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decoCircleBottom: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  backBtnPlaceholder: {
    width: 44,
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: '#fff',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },
  rightWrap: {
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  rightPlaceholder: {
    width: 44,
  },
});
