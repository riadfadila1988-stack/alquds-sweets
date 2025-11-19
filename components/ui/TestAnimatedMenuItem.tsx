import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text } from 'react-native-paper';

interface TestAnimatedMenuItemProps {
    href: string;
    icon: any;
    text: string;
    color: readonly [string, string, ...string[]];
}

/**
 * TEST VERSION - Forces JELLO animation (very obvious!)
 * Use this to verify animations are working
 */
export default function TestAnimatedMenuItem({ href, icon, text, color }: TestAnimatedMenuItemProps) {
    console.log(`🧪 TEST: ${text} - FORCED JELLO ANIMATION`);

    const scaleValue = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Fade in
        Animated.timing(opacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();

        // JELLO animation - VERY VISIBLE!
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(scaleValue, {
                    toValue: 1.3, // HUGE scale!
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleValue, {
                    toValue: 0.7, // Very small!
                    tension: 200,
                    friction: 2, // Very jiggly!
                    useNativeDriver: true,
                }),
                Animated.spring(scaleValue, {
                    toValue: 1.3,
                    tension: 200,
                    friction: 2,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleValue, {
                    toValue: 1,
                    tension: 200,
                    friction: 5,
                    useNativeDriver: true,
                }),
                Animated.delay(1000), // Short pause
            ])
        );

        console.log(`🎬 Starting JELLO animation for ${text}`);
        animation.start();

        return () => {
            console.log(`🛑 Stopping animation for ${text}`);
            animation.stop();
        };
    }, [scaleValue, opacity, text]);

    const handlePress = () => {
        console.log(`📱 Pressed: ${text}`);
        router.push(href as any);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={handlePress} activeOpacity={0.85} style={styles.touchable}>
                <LinearGradient
                    colors={color}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.menuItem}
                >
                    {/* Animated icon with OBVIOUS jello effect */}
                    <Animated.View style={{
                        opacity,
                        transform: [{ scale: scaleValue }]
                    }}>
                        <Ionicons name={icon} size={36} color="#fff" />
                    </Animated.View>
                    <Text style={styles.menuText}>{text}</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    touchable: {
        flex: 1,
    },
    menuItem: {
        flex: 1,
        padding: 20,
        borderRadius: 16,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 120,
    },
    menuText: {
        fontSize: 18,
        color: '#fff',
        textAlign: 'center',
        fontWeight: '600',
        letterSpacing: 0.5,
        marginTop: 8,
    },
});

