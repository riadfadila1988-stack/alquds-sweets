import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useMaterials } from '@/hooks/use-materials';
import { useAuth } from '@/hooks/use-auth';
import Header from './components/header';
import { useTranslation } from './_i18n';

export default function UpdateMaterialQuantityScreen() {
  const { t } = useTranslation();
  const { materials, isLoading, error, update, refetch } = useMaterials();
  const { user, isLoading: authLoading } = useAuth();

  const [edits, setEdits] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // App always RTL
  const isRTL = true;

  // Initialize local edit values from materials
  useEffect(() => {
    const map: Record<string, string> = {};
    (materials || []).forEach((m: any) => {
      const id = m._id ?? m.name;
      map[id] = m.quantity != null ? String(m.quantity) : '';
    });
    setEdits(map);
  }, [materials]);

  // Filter materials by search query (name or heName)
  const filteredMaterials = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return materials || [];
    return (materials || []).filter((m: any) => {
      const name = (m.name || '').toString().toLowerCase();
      const he = (m.heName || '').toString().toLowerCase();
      return name.includes(q) || he.includes(q);
    });
  }, [materials, searchQuery]);

  const onChange = (id: string, value: string) => {
    // allow only numeric input, optional decimal and negative guard will be handled on save
    setEdits((s) => ({ ...s, [id]: value }));
  };

  const inc = (id: string, step = 1) => {
    setEdits((s) => {
      const cur = Number(s[id] ?? 0) || 0;
      return { ...s, [id]: String(cur + step) };
    });
  };

  const dec = (id: string, step = 1) => {
    setEdits((s) => {
      const cur = Number(s[id] ?? 0) || 0;
      const next = cur - step;
      return { ...s, [id]: String(next >= 0 ? next : 0) };
    });
  };

  const handleSave = async (id: string) => {
    const raw = edits[id];
    const n = raw === '' ? NaN : Number(raw);
    if (Number.isNaN(n)) {
      Alert.alert(t('invalidQuantity') || 'Please enter a valid number');
      return;
    }
    if (n < 0) {
      Alert.alert(t('invalidQuantity') || 'Quantity cannot be negative');
      return;
    }

    try {
      setSavingIds((s) => ({ ...s, [id]: true }));
      const ok = await update(id, { quantity: n });
      if (ok) {
        Alert.alert(t('saved') || 'Saved');
      } else {
        Alert.alert(t('failedToSave') || 'Failed to save quantity');
      }
    } catch {
      Alert.alert(t('failedToSave') || 'Failed to save quantity');
    } finally {
      setSavingIds((s) => ({ ...s, [id]: false }));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch?.();
    } finally {
      setRefreshing(false);
    }
  };

  if (authLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Only allow access for employee role (also allow admin for convenience)
  if (!user || (user.role !== 'employee' && user.role !== 'admin')) {
    return (
      <View style={{ flex: 1 }}>
        <Header title={t('updateMaterialsQuantity') || 'Update Materials'} />
        <View style={styles.centered}>
          <Text>{t('accessDenied') || 'Access denied. Employees only.'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title={t('updateMaterialsQuantity') || 'Update Materials'} />

      {/* Search bar with clear button (flips in RTL) */}
      <View style={[styles.searchContainer, isRTL ? { flexDirection: 'row-reverse' } : undefined]}>
        <View style={[styles.searchBar, isRTL ? { flexDirection: 'row-reverse' } : undefined]}>
          <TextInput
            style={[styles.searchInput, isRTL ? { textAlign: 'right' } : { textAlign: 'left' }]}
            placeholder={t('searchMaterials') || 'Search materials...'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            accessible
            accessibilityLabel={t('searchMaterials') || 'Search materials'}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={[styles.clearBtn, isRTL ? { marginRight: 0, marginLeft: 8 } : { marginLeft: 8 }]}
              accessibilityLabel={t('clear') || 'Clear search'}
            >
              <Text style={styles.clearBtnText}>×</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} size="large" />
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMaterials}
          ListEmptyComponent={() => (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>{isRTL ? 'لا توجد نتائج' : (t('noResults') || 'No results')}</Text>
            </View>
          )}
          keyExtractor={(item) => item._id ?? item.name}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          renderItem={({ item }) => {
            const id = item._id ?? item.name;
            const value = edits[id] ?? '';
            const saving = !!savingIds[id];
            return (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, isRTL ? { textAlign: 'right' } : undefined]}>{`${item.name}${item.heName ? ' | ' + item.heName : ''}`}</Text>
                  {/* Reverse the controls order on RTL by using row-reverse inline style */}
                  <View style={[styles.controlsRow, isRTL ? { flexDirection: 'row-reverse' } : undefined]}>
                    <TouchableOpacity style={styles.smallBtn} onPress={() => dec(id)} accessibilityLabel="decrease">
                      <Text style={styles.smallBtnText}>-</Text>
                    </TouchableOpacity>

                    <TextInput
                      style={[styles.input, isRTL ? styles.inputRtl : undefined]}
                      value={value}
                      onChangeText={(v) => onChange(id, v)}
                      keyboardType="numeric"
                      placeholder={t('quantity')}
                    />

                    <TouchableOpacity style={styles.smallBtn} onPress={() => inc(id)} accessibilityLabel="increase">
                      <Text style={styles.smallBtnText}>+</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.saveBtn} onPress={() => handleSave(id)} disabled={saving}>
                      {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{t('save') || 'Save'}</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  searchBar: { flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, height: 40, backgroundColor: '#fff' },
  clearBtn: { padding: 6, justifyContent: 'center', alignItems: 'center' },
  clearBtnText: { fontSize: 18, color: '#333' },
  noResultsContainer: { padding: 24, alignItems: 'center', justifyContent: 'center' },
  noResultsText: { color: '#666' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { marginBottom: 12, backgroundColor: '#fff' },
  name: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  controlsRow: { flexDirection: 'row', alignItems: 'center' },
  smallBtn: { width: 40, height: 40, borderRadius: 6, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  smallBtnRtl: { marginRight: 0, marginLeft: 8 },
  smallBtnText: { fontSize: 20, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, paddingHorizontal: 10, height: 40, minWidth: 80, textAlign: 'center', marginRight: 8 },
  inputRtl: { textAlign: 'center' },
  saveBtn: { backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6 },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  error: { color: 'red' },
});
