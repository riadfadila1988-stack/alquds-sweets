import {View, StyleSheet, Alert, Animated, ScrollView} from "react-native";
import React, { useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from './_i18n';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/hooks/use-auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScreenTransition } from '@/hooks/use-screen-transition';

// import the extracted reusable UI components
import PremiumHeader from '../components/ui/PremiumHeader';
import PremiumNotificationModal from '../components/ui/PremiumNotificationModal';
import RandomAnimatedMenuItem from '../components/ui/RandomAnimatedMenuItem';

export default function AdminScreen() {
    const {t} = useTranslation();
    const router = useRouter();
    const [isNotifVisible, setIsNotifVisible] = useState(false);
    const { notifications, isLoading: notifLoading, markRead, markAll, refetch: refetchNotifs } = useNotifications();
    const { user, logout } = useAuth();
    const { containerStyle } = useScreenTransition();

    // State to trigger animations across all menu items
    const [animationTrigger, setAnimationTrigger] = useState(0);
    const [isHovering, setIsHovering] = useState(false);

    const unreadCount = (notifications || []).filter((n) => !n.read).length;

    // Trigger random animation every 10 seconds when hovering
    React.useEffect(() => {
        if (!isHovering) return;

        const interval = setInterval(() => {
            console.log('🎯 Triggering synchronized animation across all icons!');
            setAnimationTrigger(prev => prev + 1);
        }, 10000); // Every 10 seconds

        return () => clearInterval(interval);
    }, [isHovering]);

    const handleLogout = () => {
        Alert.alert(
            t('logout') || 'Logout',
            t('confirmLogout') || 'Are you sure you want to logout?',
            [
                { text: t('cancel') || 'Cancel', style: 'cancel' },
                {
                    text: t('logout') || 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        router.replace('/');
                    }
                }
            ]
        );
    };

    return (
        <Animated.View style={containerStyle}>
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <PremiumHeader
                    title={t('admin') || 'Admin Dashboard'}
                    subtitle={user?.name}
                    unreadCount={unreadCount}
                    onNotificationPress={() => { setIsNotifVisible(true); refetchNotifs(); }}
                    onLogoutPress={handleLogout}
                />
                <View
                    style={{flex: 1}}
                    onStartShouldSetResponder={() => { setIsHovering(true); return false; }}
                    onResponderRelease={() => setIsHovering(false)}
                >
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    >
                        <View style={styles.gridContainer}>
                    <View style={styles.gridRow}>
                        <RandomAnimatedMenuItem
                            href="/dashboard"
                            icon="stats-chart"
                            text={t('statistics') || 'Statistics'}
                            color={["#ff7e5f","#feb47b","#ff9a9e"]}
                            animationTrigger={animationTrigger}
                        />
                        <RandomAnimatedMenuItem
                            href="/employees-hours"
                            icon="time"
                            text={t('employeesHoursTitle')}
                            color={['#f093fb', '#f5576c']}
                            animationTrigger={animationTrigger}
                        />
                    </View>
                    <View style={styles.gridRow}>
                        <RandomAnimatedMenuItem
                            href="/users"
                            icon="people"
                            text={t('manageUsers') || 'Manage Users'}
                            color={['#4facfe', '#00f2fe']}
                            animationTrigger={animationTrigger}
                        />
                        <RandomAnimatedMenuItem
                            href="/material-groups"
                            icon="cube"
                            text={t('materialsManagement')}
                            color={['#43e97b', '#38f9d7']}
                            animationTrigger={animationTrigger}
                        />
                    </View>
                    <View style={styles.gridRow}>
                        <RandomAnimatedMenuItem
                            href="/task-groups"
                            icon="list"
                            text={t('taskGroups') || 'Task Groups'}
                            color={['#fa709a', '#fee140']}
                            animationTrigger={animationTrigger}
                        />
                        <RandomAnimatedMenuItem
                            href="/plan-work-day"
                            icon="calendar"
                            text={t('planWorkDay') || 'Plan Work Day'}
                            color={['#30cfd0', '#330867']}
                            animationTrigger={animationTrigger}
                        />
                    </View>
                    <View style={styles.gridRow}>
                        <RandomAnimatedMenuItem
                            href="/work-status"
                            icon="checkmark-circle"
                            text={t('workStatus') || 'Work Status'}
                            color={['#a8edea', '#fed6e3']}
                            animationTrigger={animationTrigger}
                        />
                     </View>
                </View>
            </ScrollView>
        </View>

            {/* Premium Notifications Modal */}
            <PremiumNotificationModal
                visible={isNotifVisible}
                onClose={() => setIsNotifVisible(false)}
                notifications={notifications || []}
                isLoading={notifLoading}
                markRead={markRead}
                markAll={markAll}
                refetch={refetchNotifs}
                t={t}
            />
            </SafeAreaView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    // Premium Header Styles
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
    // Menu Styles - Grid Layout
    gridContainer: {
        width: '100%',
        maxWidth: 800,
        alignSelf: 'center',
        paddingTop: 20,
        paddingHorizontal: 16,
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 16,
    },
    gridItemPlaceholder: {
        flex: 1,
    },
    title: { fontSize: 24, fontWeight: 'bold' },
    menu: {
        width: '100%',
        maxWidth: 420,
        alignItems: 'center',
        alignSelf: 'center',
        paddingTop: 20,
        paddingHorizontal: 20,
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
        minWidth: 0,
    },
    menuText: {
        fontSize: 18,
        color: '#fff',
        textAlign: 'center',
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    // Modal Styles
    notifIcon: { fontSize: 20 },
    unreadBadge: {
        position: 'absolute',
        top: -6,
        right: -10,
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        elevation: 4,
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
    },
    unreadText: { color: '#fff', fontWeight: '700', fontSize: 12 },
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
    modalContainer: {
        height: '75%',
        width: '92%',
        maxWidth: 720,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 12,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        marginBottom: 8,
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#333' },
    logoutText: { fontSize: 18, color: '#667eea' },

    // Premium Modal Styles
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
