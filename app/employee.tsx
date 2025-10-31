import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert} from 'react-native';
import {useTranslation} from './_i18n';
import { Link, useRouter } from 'expo-router';
import Header from './components/header';
import { useAuth } from '@/hooks/use-auth';
import { Ionicons } from '@expo/vector-icons';

export default function EmployeeScreen() {
    const {t} = useTranslation();
    const { user, logout } = useAuth();
    const router = useRouter();
    return (
        <View style={styles.screen}>
            <Header title={t('employeeDashboard') || 'Employee'} subtitle={user?.name} showBack={false} right={
                <TouchableOpacity accessibilityRole="button" onPress={() => {
                    Alert.alert(t('logout') || 'Logout', t('confirmLogout') || 'Are you sure you want to logout?', [
                        { text: t('cancel') || 'Cancel', style: 'cancel' },
                        { text: t('logout') || 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/'); } }
                    ]);
                }}>
                    <Ionicons name="power" size={20} color="#333" accessibilityLabel={t('logout') || 'Logout'} />
                </TouchableOpacity>
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
});
