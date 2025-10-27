import {Text, View, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Button, FlatList} from "react-native";
import { useState } from "react";
import {Link} from "expo-router";
import { useTranslation } from './_i18n';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/hooks/use-auth';
import Header from './components/header';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminScreen() {
    const {t} = useTranslation();
    const [isNotifVisible, setIsNotifVisible] = useState(false);
    const { notifications, isLoading: notifLoading, markRead, markAll, refetch: refetchNotifs } = useNotifications();
    const { user } = useAuth();

    const unreadCount = (notifications || []).filter((n) => !n.read).length;
    return (
        <SafeAreaView style={styles.container}>
            <Header
              title={t('admin') || 'Admin Dashboard'}
              showBack={false}
              right={
                user?.role === 'admin' ? (
                  <TouchableOpacity onPress={() => { setIsNotifVisible(true); refetchNotifs(); }} style={{ padding: 6 }}>
                    <Text style={styles.notifIcon}>🔔</Text>
                    {unreadCount > 0 && <View style={styles.unreadBadge}><Text style={styles.unreadText}>{unreadCount}</Text></View>}
                  </TouchableOpacity>
                ) : null
              }
            />
            <View style={styles.menu}>
                <Link href="/employees-hours" asChild>
                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuText}>{t('employeesHoursTitle')}</Text>
                    </TouchableOpacity>
                </Link>
                <Link href="/add-user" asChild>
                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuText}>{t('addUser')}</Text>
                    </TouchableOpacity>
                </Link>
                <Link href="/materials" asChild>
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
            <Modal visible={isNotifVisible} animationType="slide" onRequestClose={() => setIsNotifVisible(false)}>
                <View style={{ flex: 1, padding: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 18, fontWeight: '600' }}>{t('notifications') || 'Notifications'}</Text>
                        <Button title={t('markAllRead') || 'Mark all read'} onPress={async () => { await markAll(); refetchNotifs(); }} />
                    </View>
                    {notifLoading ? (
                        <ActivityIndicator size="large" />
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
                            contentContainerStyle={{ paddingTop: 12 }}
                        />
                    )}
                    <Button title={t('close') || 'Close'} onPress={() => setIsNotifVisible(false)} />
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
});
