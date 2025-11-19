import React from 'react';
import {View, StyleSheet, ScrollView, Alert, Animated} from 'react-native';
import {useTranslation}from './_i18n';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/hooks/use-notifications';
import { useScreenTransition } from '@/hooks/use-screen-transition';
import PremiumHeader from '../components/ui/PremiumHeader';
import PremiumNotificationModal from '../components/ui/PremiumNotificationModal';
import RandomAnimatedMenuItem from '../components/ui/RandomAnimatedMenuItem';

export default function EmployeeScreen() {
    const {t} = useTranslation();
    const { user, logout } = useAuth();
    const router = useRouter();
    const { containerStyle } = useScreenTransition();

    // State to trigger animations across all menu items
    const [animationTrigger, setAnimationTrigger] = React.useState(0);
    const [isHovering, setIsHovering] = React.useState(false);

    // Notifications for employee
    const [isNotifVisible, setIsNotifVisible] = React.useState(false);
    const { notifications, isLoading: notifLoading, markRead, markAll, refetch: refetchNotifs } = useNotifications();
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
                { text: t('logout') || 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/'); } }
            ]
        );
    };

    return (
        <Animated.View style={containerStyle}>
            <View style={styles.screen}>
                <PremiumHeader
                    title={t('employeeDashboard') || 'Employee'}
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
                <ScrollView contentContainerStyle={styles.container}>
                     <View style={styles.gridContainer}>
                    <View style={styles.gridRow}>
                        <RandomAnimatedMenuItem
                            href="/working-hours"
                            icon="time"
                            text={t('workingHours') || 'Working Hours'}
                            color={["#667eea", "#764ba2"]}
                            animationTrigger={animationTrigger}
                        />
                        <RandomAnimatedMenuItem
                            href="/today-tasks"
                            icon="list"
                            text={t('todayTasks') || "Today's Tasks"}
                            color={["#f093fb", "#f5576c"]}
                            animationTrigger={animationTrigger}
                        />
                    </View>
                    <View style={styles.gridRow}>
                        <RandomAnimatedMenuItem
                            href="/update-material-quantity"
                            icon="cube"
                            text={t('updateMaterialsQuantity') || 'Update Materials'}
                            color={["#43e97b", "#38f9d7"]}
                            animationTrigger={animationTrigger}
                        />
                        <View style={styles.gridItemPlaceholder} />
                    </View>
                </View>
            </ScrollView>
        </View>

            {/* Use shared PremiumNotificationModal */}
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
             </View>
         </Animated.View>
     );
}

const styles = StyleSheet.create({
    // top-level screen wrapper so header stays at top and content scrolls below it
    screen: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    container: {
        // keep horizontal centering but start content from top so header remains visible
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 20,
        paddingTop: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 30,
    },
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
    notifIcon: { fontSize: 20 },
    unreadBadge: { position: 'absolute', top: -6, right: -10, backgroundColor: '#FF3B30', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, elevation: 4, shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4 },
    unreadText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
    modalContainer: { height: '75%', width: '92%', maxWidth: 720, backgroundColor: '#fff', borderRadius: 20, padding: 12, overflow: 'hidden', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', marginBottom: 8 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#333' },
});
