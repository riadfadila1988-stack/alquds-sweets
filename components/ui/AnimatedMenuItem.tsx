import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  href?: any;
  icon: string;
  text: string;
  delay?: number;
  color: string[];
  onPress?: () => void;
};

export default function AnimatedMenuItem({ href, icon, text, delay = 0, color, onPress }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const router = useRouter();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay,
        useNativeDriver: true,
        friction: 4,
      }),
    ]).start();
  }, [delay, fadeAnim, scaleAnim]);

  const handlePress = () => {
    if (onPress) return onPress();
    if (href) {
      router.push({ pathname: href, params: { headerColor1: color[0], headerColor2: color[1] } } as any);
    }
  };

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={handlePress}>
      <Animated.View style={[{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient colors={color as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.menuItem}>
          <Ionicons name={icon as any} size={28} color="#fff" style={{ marginBottom: 8 }} />
          <Text style={styles.menuText}>{text}</Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  menuItem: {
    padding: 16,
    borderRadius: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    marginBottom: 12,
    width: '100%'
  },
  menuText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
