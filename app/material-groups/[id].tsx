import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Alert, TouchableOpacity, Modal, FlatList, Pressable, TextInput } from 'react-native';
import { useMaterialGroups } from '@/hooks/use-material-groups';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getMaterialGroup } from '@/services/material-group';
import { useTranslation } from '@/app/_i18n';
import Header from '../components/header';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import MaterialListItem from '@/components/material/material-list-item';
import { useMaterials } from '@/hooks/use-materials';
import { MaterialIcons } from '@expo/vector-icons';
import MaterialForm from '@/components/material/material-form';

export default function EditMaterialGroupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { update } = useMaterialGroups();
  // get materials and update helper to edit single materials
  const { materials: allMaterials, update: updateMaterial, create: createMaterial } = useMaterials();

  const [group, setGroup] = useState<any | null>(null);
  const [localMaterials, setLocalMaterials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // edit material modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any | null>(null);

  // picker modal state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const openEditModal = (mat: any) => {
    if (!mat) return;
    // material can be id string or object
    const m = typeof mat === 'string' ? (allMaterials || []).find((a: any) => String(a._id) === String(mat)) || { _id: mat, name: '' } : mat;
    setEditingMaterial(m);
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingMaterial(null);
  };

  // wrapper to update a material and keep the group's localMaterials in sync
  const handleMaterialUpdate = async (id: string, data: Partial<any>) => {
    try {
      const ok = await updateMaterial(String(id), data);
      if (ok) {
        setLocalMaterials(prev => prev.map(m => (String(m._id ?? m) === String(id) ? ({ ...m, ...data }) : m)));
      }
      return ok;
    } catch (err) {
      console.error('handleMaterialUpdate error', err);
      return false;
    }
  };

  useEffect(() => {
    if (!id) return;
    if (id === 'new') {
      router.replace('/material-groups/new' as any);
      return;
    }

    let mounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await getMaterialGroup(String(id));
        if (mounted) {
          setGroup(data);
          const mats = (data?.materials || []).map((m: any) => (typeof m === 'string' ? { _id: m, name: m } : m));
          setLocalMaterials(mats);
        }
      } catch (err: any) {
        console.error('Failed to load material group', err);
        const status = err?.response?.status;
        if (status === 404) {
          Alert.alert(t('notFound') || 'Not found', t('materialGroupNotFound') || 'Material group not found');
          router.replace('/material-groups' as any);
          return;
        }
        const msg = err?.message || (t('error') || 'Failed to load material group');
        if (mounted) setError(msg);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id, router, t]);

  const saveMaterials = async (materialsArr: any[]) => {
    if (!id) return false;
    try {
      setIsSaving(true);
      const ids = materialsArr.map((m: any) => m._id ?? m);
      await update({ id: String(id), data: { materials: ids } });
      // keep local state in sync
      setGroup((g: any) => ({ ...(g || {}), materials: ids }));
      return true;
    } catch (err: any) {
      console.error('Failed to save material group materials', err);
      Alert.alert(t('error') || 'Error', err?.message || 'Failed to save group');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const onDragEnd = async ({ data }: { data: any[] }) => {
    setLocalMaterials(data);
    await saveMaterials(data);
  };

  const openPicker = () => {
    setPickerSearch('');
    setPickerVisible(true);
  };

  const closePicker = () => setPickerVisible(false);

  const addMaterialToGroup = async (mat: any) => {
    // if already present, do nothing
    const exists = localMaterials.find((m) => String(m._id) === String(mat._id));
    if (exists) {
      Alert.alert(t('info') || 'Info', t('materialAlreadyInGroup') || 'Material already in group');
      return;
    }
    const next = [...localMaterials, mat];
    setLocalMaterials(next);
    const ok = await saveMaterials(next);
    if (ok) {
      // keep picker open for multiple adds
    } else {
      // revert
      setLocalMaterials(localMaterials);
    }
  };

  const removeMaterialFromGroup = async (matId: string) => {
    const next = localMaterials.filter((m) => String(m._id) !== String(matId));
    setLocalMaterials(next);
    const ok = await saveMaterials(next);
    if (!ok) {
      // revert by reloading group
      try {
        const data = await getMaterialGroup(String(id));
        const mats = (data?.materials || []).map((m: any) => (typeof m === 'string' ? { _id: m, name: m } : m));
        setLocalMaterials(mats);
      } catch {
        // ignore reload errors
      }
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Header title={t('loading') || 'Loading'} />
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 12 }}>{t('loading') || 'Loading...'}</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header title={t('error') || 'Error'} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.container}>
        <Header title={t('materialGroup') || 'Material Group'} />
        <Text style={styles.empty}>{t('r') || 'Material group not found'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title={group.name || t('materialGroup') || 'Material Group'} />

      <View style={{ flex: 1 }}>
        {localMaterials && localMaterials.length > 0 ? (
          <DraggableFlatList
            data={localMaterials}
            keyExtractor={(item) => String(item._id ?? item)}
            renderItem={({ item, drag, isActive }: RenderItemParams<any>) => {
              return (
                // open edit modal on press, keep long-press for drag
                <TouchableOpacity  onLongPress={drag} disabled={isActive} activeOpacity={0.9} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* Delete button moved inside the card container and positioned absolutely at top-left */}
                    <View style={{ flex: 1, position: 'relative' }}>
                      <TouchableOpacity
                        onPress={() => removeMaterialFromGroup(item._id)}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          zIndex: 10,
                          width: 36,
                          height: 36,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 18,
                          backgroundColor: 'rgba(255,255,255,0.9)'
                        }}
                        accessibilityLabel={t('removeMaterial') || 'Remove material'}
                      >
                        <MaterialIcons name="delete" size={20} color="#d9534f" />
                      </TouchableOpacity>

                      <MaterialListItem onPress={() => openEditModal(item)} item={item} />
                    </View>

                    <TouchableOpacity
                      onPressIn={drag}
                      disabled={isActive}
                      style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center'}}
                      accessibilityLabel={t('dragHandle') || 'Drag'}
                    >
                      <MaterialIcons name="drag-handle" size={20} color={isActive ? '#007AFF' : '#777'} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }}
            onDragEnd={onDragEnd}
            contentContainerStyle={{ padding: 16 }}
          />
        ) : (
          <View style={{ padding: 16 }}>
            <Text style={{ color: '#666' }}>{t('noMaterialsData') || 'No materials in this group'}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={openPicker}>
        <Text style={styles.addBtnText}>+</Text>
      </TouchableOpacity>

      <Modal visible={pickerVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '92%', maxHeight: '80%', backgroundColor: '#fff', borderRadius: 8, padding: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>{t('addMaterialToGroup') || 'Add material'}</Text>
              <TouchableOpacity onPress={closePicker} style={{ padding: 6 }}>
                <MaterialIcons name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder={t('searchMaterials') || 'Search materials...'}
              value={pickerSearch}
              onChangeText={setPickerSearch}
              style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 8, marginBottom: 8 }}
            />

            <FlatList
              data={(allMaterials || []).filter((m: any) => {
                // don't show materials that are already in the group
                // handle cases where localMaterials items are objects ({ _id }) or raw ids (string)
                const alreadyInGroup = localMaterials.some((lm: any) => String(lm?._id ?? lm) === String(m?._id ?? m));
                if (alreadyInGroup) return false;

                const q = (pickerSearch || '').trim().toLowerCase();
                if (!q) return true;
                return (m.name || '').toLowerCase().includes(q) || (m.heName || '').toLowerCase().includes(q);
              })}
              keyExtractor={(item) => String(item._id)}
              renderItem={({ item }) => (
                <Pressable style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f1f1f1', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} onPress={() => addMaterialToGroup(item)}>
                  <Text style={{ color: '#007AFF', textAlign: 'left' }}>{t('add') || 'Add'}</Text>
                  <Text style={{textAlign: 'right'}}>{`${item.name}${item.heName ? ' | ' + item.heName : ''}`}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Edit material modal using shared MaterialForm component */}
      <MaterialForm
        visible={editModalVisible}
        onClose={closeEditModal}
        initialData={editingMaterial}
        onUpdate={handleMaterialUpdate}
        onCreate={createMaterial}
      />

      {isSaving && (
        <View style={styles.centerOverlay} pointerEvents="none">
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 12 }}>{t('saving') || 'Saving...'}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: 'red', textAlign: 'center', marginTop: 20 },
  empty: { textAlign: 'center', color: '#666', marginTop: 24 },
  centerOverlay: { position: 'absolute', left: 0, right: 0, top: 60, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.6)' },
  addBtn: { position: 'absolute', left: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  addBtnText: { color: '#fff', fontSize: 32, lineHeight: 34 },
});
