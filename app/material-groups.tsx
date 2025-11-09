import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useMaterialGroups } from '@/hooks/use-material-groups';
import { useTranslation } from './_i18n';
import { Link } from 'expo-router';
import Header from './components/header';

export default function MaterialGroupsScreen() {
  const { t } = useTranslation();
  const { materialGroups, isLoading, error, remove } = useMaterialGroups();

  const confirmDelete = (id: string, name?: string) => {
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
      <Header title={t('materialGroups') || 'Material Groups'} />

      {isLoading ? (
        <ActivityIndicator size="large" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={materialGroups}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={() => (
            <View style={styles.listHeader}>
              <Link href={'/materials'} asChild>
                <TouchableOpacity style={styles.showMaterialsBtn}>
                  <Text style={styles.showMaterialsBtnText}>{t('materialsList') || 'Materials list'}</Text>
                </TouchableOpacity>
              </Link>
            </View>
          )}
          renderItem={({ item }) => (
            <Link href={`./material-groups/${item._id}`} asChild>
              <TouchableOpacity onLongPress={() => confirmDelete(item._id, item.name)} style={styles.itemContainer}>
                <Text style={styles.itemText}>{item.name}</Text>
              </TouchableOpacity>
            </Link>
          )}
          contentContainerStyle={{ paddingBottom: 80 }}
          ListEmptyComponent={<Text style={styles.empty}>{t('noMaterialGroups') || 'No material groups yet'}</Text>}
        />
      )}

      <Link href={{ pathname: '/material-groups/[id]', params: { id: 'new' } } as any} asChild>
        <TouchableOpacity style={styles.addBtn}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  errorText: { color: 'red', textAlign: 'center', marginTop: 20 },
  empty: { textAlign: 'center', color: '#666', marginTop: 24 },
  itemContainer: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee',  },
  itemText: { fontSize: 16, textAlign: 'right' },
  listHeader: { paddingBottom: 12 },
  showMaterialsBtn: { alignSelf: 'stretch', padding: 12, backgroundColor: '#e6f0ff', borderRadius: 8, marginBottom: 8 },
  showMaterialsBtnText: { color: '#0366d6', textAlign: 'center', fontWeight: '600' },
  addBtn: { position: 'absolute', left: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  addBtnText: { color: '#fff', fontSize: 32, lineHeight: 34 },
});
