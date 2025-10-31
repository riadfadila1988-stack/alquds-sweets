import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Switch } from 'react-native';
import { useTranslation } from './_i18n';
import Header from './components/header';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUsers } from '@/hooks/use-users';
import { updateUser } from '@/services/user';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

export default function UsersScreen() {
  const { t } = useTranslation();
  const { users, isLoading } = useUsers();
  const queryClient = useQueryClient();
  const router = useRouter();
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
    <View style={[styles.item, isRTL ? styles.itemRtl : null]}>
      <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.7} onPress={() => router.push({ pathname: '/edit-user/[id]', params: { id: item._id } } as any)}>
        <Text style={[styles.name, isRTL ? styles.textRight : null]}>{item.name}</Text>
        <Text style={[styles.meta, isRTL ? styles.textRight : null]}>{item.idNumber} • {item.role}</Text>
      </TouchableOpacity>

      <View style={[styles.actions, isRTL ? styles.actionsRtl : null]}>
        <Switch value={!!item.active} onValueChange={() => toggleActive(item._id, item.active)} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header titleKey="manageUsers" />
      <View style={styles.topRow}>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      <TouchableOpacity style={[styles.addBtn, isRTL ? styles.addBtnRTL : null]} onPress={() => router.push('/add-user')}>
        <Text style={styles.addText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 0, paddingVertical: 6 },
  subtitle: { color: '#6b7280' },
  addBtn: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#0ea5a4', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  // mirrored add button for RTL
  addBtnRTL: { left: 20, right: undefined },
  addText: { color: '#fff', fontSize: 32, lineHeight: 34 },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#f8fafc', borderRadius: 10, marginHorizontal: 0 },
  // RTL variant flips row ordering so name/meta appear on the right and switch on the left
  itemRtl: { flexDirection: 'row-reverse' },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { color: '#6b7280', marginTop: 4 },
  actions: { marginLeft: 12, alignItems: 'center', justifyContent: 'center' },
  // Adjust actions spacing for RTL
  actionsRtl: { marginLeft: 0, marginRight: 12 },
  textRight: { textAlign: 'right' },
});
