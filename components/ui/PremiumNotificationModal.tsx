import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Animated, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type NotificationItem = {
    _id: string;
    message: string;
    read?: boolean;
    createdAt: string;
};

type Props = {
    visible: boolean;
    onClose: () => void;
    notifications: NotificationItem[];
    isLoading: boolean;
    markRead: (id: string) => Promise<boolean>;
    markAll: () => Promise<boolean>;
    refetch: () => void;
    t: (key: string) => string;
};

export default function PremiumNotificationModal({ visible, onClose, notifications, isLoading, markRead, markAll, refetch, t }: Props) {
    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 9,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const handleMarkAll = async () => {
        await markAll();
        refetch();
    };

    const handleMarkRead = async (id: string) => {
        await markRead(id);
        refetch();
    };

    return (
        <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
            <Animated.View style={[styles.modalOverlay, styles.modalOverlayTop, { opacity: fadeAnim }]}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <Animated.View
                    style={[
                        styles.premiumModalContainer,
                        {
                            transform: [
                                {
                                    translateY: slideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [-800, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <LinearGradient
                        colors={["#667eea", "#764ba2"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.premiumModalHeader}
                    >
                        <View style={styles.modalHeaderContent}>
                            <View style={styles.modalHeaderLeft}>
                                <Ionicons name="notifications" size={28} color="#fff" />
                                <Text style={styles.premiumModalTitle}>{t('notifications') || 'Notifications'}</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={28} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        {notifications.filter(n => !n.read).length > 0 && (
                            <TouchableOpacity
                                onPress={handleMarkAll}
                                style={styles.markAllButton}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="checkmark-done" size={18} color="#667eea" style={{ marginRight: 6 }} />
                                <Text style={styles.markAllText}>{t('markAllRead') || 'Mark all read'}</Text>
                            </TouchableOpacity>
                        )}
                    </LinearGradient>

                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#667eea" />
                            <Text style={styles.loadingText}>Loading notifications...</Text>
                        </View>
                    ) : notifications.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="notifications-off" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>No notifications</Text>
                            <Text style={styles.emptySubtext}>{"You\'re all caught up!"}</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={notifications}
                            keyExtractor={(item) => item._id}
                            renderItem={({ item }) => (
                                <Animated.View
                                    style={[
                                        styles.notificationItem,
                                        !item.read && styles.unreadItem,
                                        {
                                            opacity: slideAnim,
                                            transform: [
                                                {
                                                    translateX: slideAnim.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [50, 0],
                                                    }),
                                                },
                                            ],
                                        },
                                    ]}
                                >
                                    <View style={styles.notificationContent}>
                                        <View style={styles.notificationIcon}>
                                            <LinearGradient
                                                colors={item.read ? ['#e0e0e0', '#f5f5f5'] : ['#667eea', '#764ba2']}
                                                style={styles.notificationIconGradient}
                                            >
                                                <Ionicons
                                                    name={item.read ? "mail-open" : "mail"}
                                                    size={20}
                                                    color={item.read ? "#999" : "#fff"}
                                                />
                                            </LinearGradient>
                                        </View>
                                        <View style={styles.notificationTextContainer}>
                                            <Text style={[styles.notificationMessage, !item.read && styles.unreadMessage]}>
                                                {item.message}
                                            </Text>
                                            <View style={styles.notificationMeta}>
                                                <Ionicons name="time" size={14} color="#999" style={{ marginRight: 4 }} />
                                                <Text style={styles.notificationTime}>
                                                    {new Date(item.createdAt).toLocaleString()}
                                                </Text>
                                            </View>
                                        </View>
                                        {!item.read && (
                                            <TouchableOpacity
                                                onPress={() => handleMarkRead(item._id)}
                                                style={styles.markReadButton}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="checkmark-circle" size={24} color="#667eea" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </Animated.View>
                            )}
                            contentContainerStyle={styles.notificationList}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16
    },
    modalOverlayTop: {
        justifyContent: 'flex-start',
        paddingTop: 0,
        paddingHorizontal: 0,
        paddingBottom: 16,
    },
    premiumModalContainer: {
        height: '80%',
        width: '100%',
        maxWidth: 720,
        backgroundColor: '#fff',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        overflow: 'hidden',
        elevation: 20,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        alignSelf: 'center',
    },
    premiumModalHeader: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
    },
    modalHeaderContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    premiumModalTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.5,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    markAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    markAllText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#667eea',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#999',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        marginTop: 20,
        fontSize: 20,
        fontWeight: '600',
        color: '#666',
    },
    emptySubtext: {
        marginTop: 8,
        fontSize: 14,
        color: '#999',
    },
    notificationList: {
        padding: 16,
    },
    notificationItem: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        overflow: 'hidden',
    },
    unreadItem: {
        backgroundColor: '#f8f9ff',
        borderLeftWidth: 4,
        borderLeftColor: '#667eea',
    },
    notificationContent: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
    },
    notificationIcon: {
        marginRight: 12,
    },
    notificationIconGradient: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notificationTextContainer: {
        flex: 1,
    },
    notificationMessage: {
        fontSize: 15,
        color: '#333',
        lineHeight: 22,
    },
    unreadMessage: {
        fontWeight: '600',
        color: '#000',
    },
    notificationMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    notificationTime: {
        fontSize: 13,
        color: '#999',
    },
    markReadButton: {
        marginLeft: 12,
        padding: 8,
    },
});
