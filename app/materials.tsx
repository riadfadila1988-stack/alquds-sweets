import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import MaterialListItem from '@/components/material/material-list-item';
import MaterialForm from '@/components/material/material-form';
import { useMaterials } from '@/hooks/use-materials';
import { useTranslation } from './_i18n';
import { useAuth } from '@/hooks/use-auth';
import Header from './components/header';

export default function MaterialsScreen() {
  const { t } = useTranslation();
  const { materials, isLoading, error, create, update, remove } = useMaterials();
  const { user } = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any | null>(null);

  // RTL forced on
  const isRTL = true;

  const handleCreate = async (data: any) => {
    return create(data);
  };

  const handleUpdate = async (id: string, data: any) => {
    return update(id, data);
  };

  // Accept optional id and bail out early if missing to satisfy TypeScript strictness.
  const confirmDelete = (id?: string, name?: string) => {
    if (!id) return;
    Alert.alert(
      t('delete') || 'Delete',
      (t('deleteConfirm') || 'Are you sure you want to delete this item?') + (name ? `\n${name}` : ''),
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        { text: t('delete') || 'Delete', style: 'destructive', onPress: async () => { await remove(id); } },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header title={t('materialsManagement') || 'Materials'} />

      {isLoading ? (
        <ActivityIndicator size="large" />
      ) : error ? (
        <Text style={[styles.errorText, isRTL ? styles.textRight : null]}>{error}</Text>
      ) : (
        <FlatList
          data={materials}
          keyExtractor={(item) => item._id ?? item.name}
          renderItem={({ item }) => (
            <MaterialListItem
              item={item}
              onPress={() => { setSelectedMaterial(item); setIsModalVisible(true); }}
              onLongPress={user?.role === 'admin' ? () => confirmDelete(item._id, item.name) : undefined}
            />
          )}
          contentContainerStyle={{ paddingBottom: 80 }}
          ListEmptyComponent={<Text style={[styles.empty, isRTL ? styles.textRight : null]}>{t('noEmployeesData') || 'No materials yet'}</Text>}
        />
      )}

      <TouchableOpacity style={[styles.addBtn, isRTL ? styles.addBtnRTL : null]} onPress={() => { setSelectedMaterial(null); setIsModalVisible(true); }}>
        <Text style={styles.addBtnText}>+</Text>
      </TouchableOpacity>

      <MaterialForm
        visible={isModalVisible}
        onClose={() => { setIsModalVisible(false); setSelectedMaterial(null); }}
        onCreate={handleCreate}
        initialData={selectedMaterial}
        onUpdate={handleUpdate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  addBtn: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  // mirrored add button for RTL
  addBtnRTL: { left: 20, right: undefined },
  addBtnText: { color: '#fff', fontSize: 32, lineHeight: 34 },
  empty: { textAlign: 'center', color: '#666', marginTop: 24 },
  errorText: { color: 'red', textAlign: 'center', marginTop: 20 },
  // helper text align for RTL
  textRight: { textAlign: 'right' },
});
