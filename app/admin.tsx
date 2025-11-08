import {Text, View, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Button, FlatList, Alert} from "react-native";
import { useState } from "react";
import {Link, useRouter} from "expo-router";
import { useTranslation } from './_i18n';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/hooks/use-auth';
import Header from './components/header';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function AdminScreen() {
    const {t} = useTranslation();
    const router = useRouter();
    const [isNotifVisible, setIsNotifVisible] = useState(false);
    const { notifications, isLoading: notifLoading, markRead, markAll, refetch: refetchNotifs } = useNotifications();
    const { user, logout } = useAuth();

    const unreadCount = (notifications || []).filter((n) => !n.read).length;
    return (
        <SafeAreaView style={styles.container}>
            <Header
              title={t('admin') || 'Admin Dashboard'}
              subtitle={user?.name}
              showBack={false}
              right={
                // show notification icon (for admins) and a logout button side-by-side
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {user?.role === 'admin' ? (
                    <TouchableOpacity onPress={() => { setIsNotifVisible(true); refetchNotifs(); }} style={{ padding: 6, marginRight: 8 }}>
                      <Text style={styles.notifIcon}>🔔</Text>
                      {unreadCount > 0 && <View style={styles.unreadBadge}><Text style={styles.unreadText}>{unreadCount}</Text></View>}
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity accessibilityRole="button" onPress={() => {
                    Alert.alert(t('logout') || 'Logout', t('confirmLogout') || 'Are you sure you want to logout?', [
                      { text: t('cancel') || 'Cancel', style: 'cancel' },
                      { text: t('logout') || 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/'); } }
                    ]);
                  }} style={{ padding: 6 }}>
                    <Ionicons name="power" size={20} color={styles.logoutText.color} accessibilityLabel={t('logout') || 'Logout'} />
                  </TouchableOpacity>
                </View>
              }
            />
            <View style={styles.menu}>
                <Link href="/employees-hours" asChild>
                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuText}>{t('employeesHoursTitle')}</Text>
                    </TouchableOpacity>
                </Link>
                <Link href="/users" asChild>
                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuText}>{t('manageUsers') || 'Manage Users'}</Text>
                    </TouchableOpacity>
                </Link>
                <Link href="/materials" asChild>
                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuText}>{t('materialsManagement')}</Text>
                    </TouchableOpacity>
                </Link>
                <Link href="/material-groups" asChild>
                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuText}>{t('materialsManagement')}</Text>
                    </TouchableOpacity>
                </Link>
                <Link href="/task-groups" asChild>
                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuText}>{t('taskGroups') || 'Task Groups'}</Text>
                    </TouchableOpacity>
                </Link>
                <Link href="/plan-work-day" asChild>
                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuText}>{t('planWorkDay') || 'Plan Work Day'}</Text>
                    </TouchableOpacity>
                </Link>
                <Link href="/work-status" asChild>
                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuText}>{t('workStatus') || 'Work Status'}</Text>
                    </TouchableOpacity>
                </Link>
            </View>
            {/* Add admin features here */}

            {/* Notifications modal for admins */}
            <Modal visible={isNotifVisible} animationType="slide" transparent onRequestClose={() => setIsNotifVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('notifications') || 'Notifications'}</Text>
                            <Button title={t('markAllRead') || 'Mark all read'} onPress={async () => { await markAll(); refetchNotifs(); }} />
                        </View>
                        {notifLoading ? (
                            <ActivityIndicator size="large" style={{ flex: 1 }} />
                        ) : (
                            <FlatList
                                data={notifications}
                                keyExtractor={(item) => item._id}
                                renderItem={({ item }) => (
                                    <View style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontWeight: item.read ? '400' : '700' }}>{item.message}</Text>
                                            <Text style={{ color: '#666', marginTop: 6 }}>{new Date(item.createdAt).toLocaleString()}</Text>
                                        </View>
                                        {!item.read && <Button title={t('markRead') || 'Mark read'} onPress={async () => { await markRead(item._id); refetchNotifs(); }} />}
                                    </View>
                                )}
                                contentContainerStyle={{ paddingTop: 12, paddingBottom: 12 }}
                                style={{ flex: 1 }}
                            />
                        )}
                        <View style={{ marginTop: 8 }}>
                            <Button title={t('close') || 'Close'} onPress={() => setIsNotifVisible(false)} />
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'flex-start', alignItems: 'stretch', paddingHorizontal: 20 },
    title: { fontSize: 24, fontWeight: 'bold' },
    menu: {
        width: '80%',
        maxWidth: 420,
        minWidth: 280,
        alignItems: 'center',
        alignSelf: 'center',
    },
    menuItem: {
        backgroundColor: '#f0f0f0',
        padding: 20,
        borderRadius: 10,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        width: '100%',
    },
    menuText: {
        fontSize: 18,
        color: '#333',
        textAlign: 'center',
    },
    notifIcon: { fontSize: 20 },
    unreadBadge: { position: 'absolute', top: -6, right: -10, backgroundColor: '#FF3B30', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
    unreadText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 16 },
    modalContainer: { height: '75%', width: '92%', maxWidth: 720, backgroundColor: '#fff', borderRadius: 12, padding: 12, overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 8 },
    modalTitle: { fontSize: 18, fontWeight: '600' },
    logoutText: { fontSize: 18, color: '#333' },
});
