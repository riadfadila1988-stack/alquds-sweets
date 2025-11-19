import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
    title: string;
    subtitle?: string;
    unreadCount: number;
    onNotificationPress: () => void;
    onLogoutPress: () => void;
};

export default function PremiumHeader({ title, subtitle, unreadCount, onNotificationPress, onLogoutPress }: Props) {
    const headerAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const insets = useSafeAreaInsets();

    useEffect(() => {
        Animated.spring(headerAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
        }).start();

        if (unreadCount > 0) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unreadCount]);

    return (
        <Animated.View
            style={{
                transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-100, 0] }) }],
                opacity: headerAnim,
            }}
        >
            <LinearGradient
                colors={['#667eea', '#764ba2', '#f093fb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.premiumHeader, { paddingTop: insets.top + 20 }]}
            >
                <View style={styles.headerContent}>
                    <View style={styles.headerLeft}>
                        <View style={styles.avatarContainer}>
                            <LinearGradient
                                colors={['#fff', '#f0f0f0']}
                                style={styles.avatar}
                            >
                                <Ionicons name="person" size={28} color="#667eea" />
                            </LinearGradient>
                        </View>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.premiumTitle}>{title}</Text>
                            {subtitle && <Text style={styles.premiumSubtitle}>👋 {subtitle}</Text>}
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            onPress={onNotificationPress}
                            style={styles.iconButton}
                            activeOpacity={0.7}
                        >
                            <View style={styles.iconWrapper}>
                                <Ionicons name="notifications" size={24} color="#fff" />
                                {unreadCount > 0 && (
                                    <Animated.View style={[styles.badge, { transform: [{ scale: pulseAnim }] }]}>
                                        <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                                    </Animated.View>
                                )}
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={onLogoutPress}
                            style={styles.iconButton}
                            activeOpacity={0.7}
                        >
                            <View style={styles.iconWrapper}>
                                <Ionicons name="power" size={24} color="#fff" />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.headerDecoTop} />
                <View style={styles.headerDecoBottom} />
            </LinearGradient>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    premiumHeader: {
        paddingHorizontal: 20,
        paddingBottom: 30,
        position: 'relative',
        overflow: 'hidden',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 8,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        height: 200,
        justifyContent: 'center'
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    headerTextContainer: {
        flex: 1,
    },
    premiumTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.5,
    },
    premiumSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 2,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    iconWrapper: {
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
        borderWidth: 2,
        borderColor: '#fff',
    },
    badgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    headerDecoTop: {
        position: 'absolute',
        top: -50,
        right: -50,
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    headerDecoBottom: {
        position: 'absolute',
        bottom: -30,
        left: -30,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
});
