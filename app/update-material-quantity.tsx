import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useMaterials } from '@/hooks/use-materials';
import { useAuth } from '@/hooks/use-auth';
import Header from './components/header';
import { useTranslation } from './_i18n';
import { useWorkingHours } from '@/hooks/use-working-hours';

export default function UpdateMaterialQuantityScreen() {
  const { t } = useTranslation();
  const { materials, isLoading, error, updateQuantity, refetch } = useMaterials();
  const { user, isLoading: authLoading } = useAuth();
  const { currentSession } = useWorkingHours();

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
    // Prevent saving when the user is not clocked in
    if (!currentSession) {
      Alert.alert(t('mustClockIn') || 'Please clock in before saving changes');
      return;
    }
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
      const ok = await updateQuantity(id, { quantity: n });
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

      {/* Search label and input on same row (RTL-aware) */}
      <View style={[styles.searchContainerRow, isRTL ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' }]}>
        <Text style={[styles.searchLabelRow, isRTL ? { textAlign: 'right', marginLeft: 8 } : { textAlign: 'left', marginRight: 8 }]}>{t('searchMaterials') || 'Search materials'}</Text>
        <View style={[styles.searchRowCenter, isRTL ? { flexDirection: 'row-reverse' } : undefined]}>
          <TextInput
            style={[styles.searchInputRow, { minWidth: 150, flex: undefined }, isRTL ? { textAlign: 'right' } : { textAlign: 'left' }]}
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
            const updatedLabel = item.updatedAt ? new Date(item.updatedAt).toLocaleString() : undefined;

            const canSave = !!currentSession && !saving;

            return (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, isRTL ? { textAlign: 'right' } : undefined]}>
                    {`${item.name}${item.heName ? ' | ' + item.heName : ''}`}
                  </Text>

                  {updatedLabel ? (
                    <Text style={[styles.updated, isRTL ? { textAlign: 'right' } : undefined]}>
                      {`${t('updated') || 'Updated'}: ${updatedLabel}`}
                    </Text>
                  ) : null}

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

                    <TouchableOpacity
                      style={[styles.saveBtn, !canSave ? { opacity: 0.5 } : undefined]}
                      onPress={() => handleSave(id)}
                      disabled={!canSave}
                    >
                      {saving ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.saveBtnText}>{t('save') || 'Save'}</Text>
                      )}
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainerRow: { paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' },
  searchLabelRow: { fontSize: 14, marginRight: 8 },
  searchRowCenter: { flexDirection: 'row', alignItems: 'center' },
  searchInputRow: { borderWidth: 1, borderColor: '#ddd', padding: 8, borderRadius: 6 },
  clearBtn: { padding: 8 },
  clearBtnText: { fontSize: 18 },
  noResultsContainer: { padding: 20, alignItems: 'center' },
  noResultsText: { color: '#666' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#eee' },
  name: { fontSize: 16, fontWeight: '600' },
  updated: { fontSize: 12, color: '#666' },
  controlsRow: { marginTop: 8, alignItems: 'center' },
  smallBtn: { padding: 8, borderRadius: 4, backgroundColor: '#f0f0f0', marginHorizontal: 6 },
  smallBtnText: { fontSize: 16 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 8, minWidth: 80, borderRadius: 6, textAlign: 'left' },
  inputRtl: { textAlign: 'right' },
  saveBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#1976D2', marginLeft: 8, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  error: { color: '#a00' },
});
