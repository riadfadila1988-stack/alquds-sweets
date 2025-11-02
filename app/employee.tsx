import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, Button, FlatList, ActivityIndicator} from 'react-native';
import {useTranslation} from './_i18n';
import { Link, useRouter } from 'expo-router';
import Header from './components/header';
import { useAuth } from '@/hooks/use-auth';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@/hooks/use-notifications';

export default function EmployeeScreen() {
    const {t} = useTranslation();
    const { user, logout } = useAuth();
    const router = useRouter();

    // Notifications for employee
    const [isNotifVisible, setIsNotifVisible] = React.useState(false);
    const { notifications, isLoading: notifLoading, markRead, markAll, refetch: refetchNotifs } = useNotifications();
    const unreadCount = (notifications || []).filter((n) => !n.read).length;

    return (
        <View style={styles.screen}>
            <Header title={t('employeeDashboard') || 'Employee'} subtitle={user?.name} showBack={false} right={
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => { setIsNotifVisible(true); refetchNotifs(); }} style={{ padding: 6, marginRight: 8 }}>
                    <Text style={styles.notifIcon}>🔔</Text>
                    {unreadCount > 0 && <View style={styles.unreadBadge}><Text style={styles.unreadText}>{unreadCount}</Text></View>}
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button" onPress={() => {
                      Alert.alert(t('logout') || 'Logout', t('confirmLogout') || 'Are you sure you want to logout?', [
                          { text: t('cancel') || 'Cancel', style: 'cancel' },
                          { text: t('logout') || 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/'); } }
                      ]);
                  }}>
                      <Ionicons name="power" size={20} color="#333" accessibilityLabel={t('logout') || 'Logout'} />
                  </TouchableOpacity>
                </View>
            }/>

            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.menu}>
                    <Link href="/working-hours" asChild>
                        <TouchableOpacity style={styles.menuItem}>
                            <Text style={styles.menuText}>{t('workingHours')}</Text>
                        </TouchableOpacity>
                    </Link>

                    {/* Today Tasks: link for employees to view their assignments for today */}
                    <Link href="/today-tasks" asChild>
                        <TouchableOpacity style={styles.menuItem}>
                            <Text style={styles.menuText}>{t('todayTasks') || "Today's Tasks"}</Text>
                        </TouchableOpacity>
                    </Link>

                    <Link href="/update-material-quantity" asChild>
                        <TouchableOpacity style={styles.menuItem}>
                            <Text style={styles.menuText}>{t('updateMaterialsQuantity') || "Today's Tasks"}</Text>
                        </TouchableOpacity>
                    </Link>

                    {/* Additional employee features can be added here */}
                </View>
            </ScrollView>

            {/* Notifications modal for employees */}
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
        </View>
    );
}

const styles = StyleSheet.create({
    // top-level screen wrapper so header stays at top and content scrolls below it
    screen: {
        flex: 1,
        backgroundColor: '#fff',
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
    menu: {
        width: '80%',
        maxWidth: 420,
        minWidth: 280,
        alignItems: 'center',
        marginBottom: 10,
    },
    menuItem: {
        backgroundColor: '#f0f0f0',
        padding: 20,
        borderRadius: 10,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
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
});
