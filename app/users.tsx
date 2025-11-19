import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Switch } from 'react-native';
import { useTranslation } from './_i18n';
import { useUsers } from '@/hooks/use-users';
import { updateUser } from '@/services/user';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ScreenTemplate } from '@/components/ScreenTemplate';

// Premium palette
const premiumColors = {
  backgroundGradient: ['#0f2027', '#203a43', '#2c5364'] as const,
  cardGradient: ['#ffffff', '#f8fafb'] as const,
  accent: '#0a7ea4',
  accentGlow: '#0ea5a4',
  activeGreen: '#10b981',
  inactiveGray: '#94a3b8',
  textPrimary: '#1A202C',
  textSecondary: '#64748b',
  fabGradient: ['#0ea5e9', '#0a7ea4'] as const,
};

export default function UsersScreen() {
  const { t } = useTranslation();
  const { users, isLoading } = useUsers();
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useLocalSearchParams();
  const headerColor1 = (params.headerColor1 as string) || '#4facfe';
  const headerColor2 = (params.headerColor2 as string) || '#00f2fe';
  const isRTL = true;

  const toggleActive = async (id: string, currentlyActive: boolean) => {
    try {
      // Optimistic update could be added; keep simple: call API then invalidate
      await updateUser(id, { active: !currentlyActive });
      // invalidate by query key
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err: any) {
      Alert.alert(t('error') || 'Error', err.response?.data?.message || t('failedToUpdateUser') || 'Failed to update user');
    }
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => router.push({ pathname: '/edit-user/[id]', params: { id: item._id } } as any)}
      style={styles.itemWrapper}
    >
      <LinearGradient
        colors={premiumColors.cardGradient}
        style={[styles.item, isRTL ? styles.itemRtl : null]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.avatarCircle, { backgroundColor: item.active ? headerColor2 : premiumColors.inactiveGray }]}>
          <Ionicons name="person" size={22} color="#fff" />
        </View>

        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={[styles.name, isRTL ? styles.textRight : null]}>{item.name}</Text>
          <View style={[styles.metaRow, isRTL && styles.metaRowRtl]}>
            <Ionicons name="card-outline" size={14} color={premiumColors.textSecondary} style={{ marginEnd: 4 }} />
            <Text style={[styles.meta, isRTL ? styles.textRight : null]}>{item.idNumber}</Text>
            <Text style={styles.metaDot}> • </Text>
            <Ionicons name="briefcase-outline" size={14} color={premiumColors.textSecondary} style={{ marginEnd: 4 }} />
            <Text style={styles.meta}>{item.role}</Text>
          </View>
        </View>

        <View style={[styles.actions, isRTL ? styles.actionsRtl : null]}>
          <Switch
            value={!!item.active}
            onValueChange={() => toggleActive(item._id, item.active)}
            trackColor={{ false: '#cbd5e1', true: headerColor2 }}
            thumbColor="#fff"
          />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <ScreenTemplate
      title={t('manageUsers') || 'Manage Users'}
      showBackButton={true}
      showAddButton={true}
      onAddPress={() => router.push('/add-user')}
      headerGradient={[headerColor1, headerColor2, '#00f2fe'] as any}
      fabColor={headerColor1}
      fabIcon="account-plus"
    >
      <View style={styles.container}>
        {isLoading ? (
          <ActivityIndicator size="large" color={headerColor1} style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={users}
            keyExtractor={(i) => i._id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        )}
      </View>
    </ScreenTemplate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 0, paddingVertical: 6 },
  subtitle: { color: '#E2E8F0' },

  itemWrapper: { marginBottom: 0 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  itemRtl: { flexDirection: 'row-reverse' },

  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  name: { fontSize: 17, fontWeight: '700', color: premiumColors.textPrimary, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  metaRowRtl: { flexDirection: 'row-reverse' },
  meta: { fontSize: 13, color: premiumColors.textSecondary },
  metaDot: { fontSize: 13, color: premiumColors.textSecondary, marginHorizontal: 4 },

  actions: { marginLeft: 12, alignItems: 'center', justifyContent: 'center' },
  actionsRtl: { marginLeft: 0, marginRight: 12 },

  addBtn: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#0a7ea4',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  addBtnRTL: { left: 20, right: undefined },
  addBtnGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addText: { color: '#fff', fontSize: 32, lineHeight: 34 },
  textRight: { textAlign: 'right' },
});
