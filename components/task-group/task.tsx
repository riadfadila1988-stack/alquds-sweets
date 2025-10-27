import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, FlatList, Pressable, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useMaterials } from '@/hooks/use-materials';
import { IUsedMaterial } from '@/types/task-group';
import { useTranslation } from '@/app/_i18n';

interface TaskProps {
  task: any;
  onChange: (task: any) => void;
  onRemove?: () => void;
  index?: number;
}

export default function Task({ task, onChange, onRemove }: TaskProps) {
  const { t } = useTranslation();
  const isRTL = true;
  const { materials } = useMaterials();
  // Refs used to force focus when parent touchables/gestures intercept taps
  const nameRef = useRef<any>(null);
  const durationRef = useRef<any>(null);
  const descRef = useRef<any>(null);
  const usedQtyRefs = useRef<Record<number, any>>({});
  const prodQtyRefs = useRef<Record<number, any>>({});
  const [materialsCollapsed, setMaterialsCollapsed] = useState(false);
  const [producedCollapsed, setProducedCollapsed] = useState(false);
  const [activePicker, setActivePicker] = useState<{ section: 'used' | 'produced'; index: number } | null>(null);
  const [modalSearch, setModalSearch] = useState('');

  const handleFieldChange = (field: string, value: any) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.debug(`[Task] field change: ${field} ->`, value);
    }
    onChange({ ...task, [field]: value });
  };

  const toggleMaterialsCollapsed = () => setMaterialsCollapsed(v => !v);
  const toggleProducedCollapsed = () => setProducedCollapsed(v => !v);

  const addMaterialToTask = () => {
    const used = [...(task.usedMaterials || [])];
    if (materials && materials.length > 0) {
      used.push({ material: materials[0], quantity: 1 } as IUsedMaterial);
    } else {
      used.push({ material: undefined, quantity: 1 } as any);
    }
    onChange({ ...task, usedMaterials: used });
    setMaterialsCollapsed(false);
  };

  const addProducedMaterialToTask = () => {
    const produced = [...(task.producedMaterials || [])];
    if (materials && materials.length > 0) {
      produced.push({ material: materials[0], quantity: 1 } as IUsedMaterial);
    } else {
      produced.push({ material: undefined, quantity: 1 } as any);
    }
    onChange({ ...task, producedMaterials: produced });
    setProducedCollapsed(false);
  };

  const removeMaterialFromTask = (section: 'used' | 'produced', index: number) => {
    if (section === 'used') {
      const used = [...(task.usedMaterials || [])];
      used.splice(index, 1);
      onChange({ ...task, usedMaterials: used });
    } else {
      const produced = [...(task.producedMaterials || [])];
      produced.splice(index, 1);
      onChange({ ...task, producedMaterials: produced });
    }
  };

  const openMaterialPicker = (index: number, section: 'used' | 'produced') => {
    setActivePicker({ section, index });
    setModalSearch('');
  };

  const closeMaterialPicker = () => {
    setActivePicker(null);
    setModalSearch('');
  };

  const handleMaterialSelect = (material: any) => {
    if (!activePicker) return;
    const { section, index } = activePicker;
    if (section === 'used') {
      const used = [...(task.usedMaterials || [])];
      used[index] = { ...used[index], material };
      onChange({ ...task, usedMaterials: used });
    } else {
      const produced = [...(task.producedMaterials || [])];
      produced[index] = { ...produced[index], material };
      onChange({ ...task, producedMaterials: produced });
    }
    closeMaterialPicker();
  };

  const handleMaterialQuantityChange = (section: 'used' | 'produced', index: number, quantity: any) => {
    // store raw input (string) so the TextInput remains controlled and typing isn't interrupted;
    // numeric coercion can be done later when saving or computing totals.
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.debug(`[Task] quantity change: ${section}[${index}] ->`, quantity);
    }
    if (section === 'used') {
      const used = [...(task.usedMaterials || [])];
      used[index] = { ...used[index], quantity };
      onChange({ ...task, usedMaterials: used });
    } else {
      const produced = [...(task.producedMaterials || [])];
      produced[index] = { ...produced[index], quantity };
      onChange({ ...task, producedMaterials: produced });
    }
  };

  return (
    <View style={styles.taskCard}>
      {onRemove ? (
        <TouchableOpacity style={[styles.clearButton, isRTL && styles.clearButtonRtl]} onPress={onRemove}>
          <MaterialIcons name="delete" size={20} color="#d9534f" style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
        </TouchableOpacity>
      ) : null}

      <View style={styles.taskContainerInner}>
        <TextInput
          ref={nameRef}
          style={[styles.input, isRTL && styles.inputRtl]}
          placeholder={t('taskName') || 'Task Name'}
          value={task.name ?? ''}
          onChangeText={(v) => handleFieldChange('name', v)}
          onFocus={() => { if (typeof __DEV__ !== 'undefined' && __DEV__) console.debug('[Task] name input focused'); }}
          onPressIn={() => nameRef.current?.focus && nameRef.current.focus()}
          editable
          selectTextOnFocus
        />
        <TextInput
          ref={durationRef}
          style={[styles.input, isRTL && styles.inputRtl]}
          placeholder={t('durationInMinutes') || 'Duration (minutes)'}
          value={task.duration !== undefined && task.duration !== null ? String(task.duration) : ''}
          keyboardType="numeric"
          onChangeText={(v) => handleFieldChange('duration', v)}
          onFocus={() => { if (typeof __DEV__ !== 'undefined' && __DEV__) console.debug('[Task] duration input focused'); }}
          onPressIn={() => durationRef.current?.focus && durationRef.current.focus()}
          editable
          selectTextOnFocus
        />
        <TextInput
          ref={descRef}
          style={[styles.input, isRTL && styles.inputRtl]}
          placeholder={t('description') || 'Description'}
          value={task.description ?? ''}
          onChangeText={(v) => handleFieldChange('description', v)}
          onFocus={() => { if (typeof __DEV__ !== 'undefined' && __DEV__) console.debug('[Task] description input focused'); }}
          onPressIn={() => descRef.current?.focus && descRef.current.focus()}
          editable
          selectTextOnFocus
        />

        <View style={styles.headerRowSmall}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={toggleMaterialsCollapsed} style={[styles.collapseButton, isRTL && styles.collapseButtonRtl]}>
              <MaterialIcons name={materialsCollapsed ? 'expand-more' : 'expand-less'} size={20} color="#333" style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
            </TouchableOpacity>
            <Text style={[styles.label, isRTL && styles.labelRtl]}>{t('usedMaterials') || 'Used Materials'}</Text>
          </View>
          <TouchableOpacity style={styles.iconButtonSmall} onPress={addMaterialToTask}>
            <MaterialIcons name="add" size={20} color="#007AFF" style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
          </TouchableOpacity>
        </View>

        {!materialsCollapsed && (
          <>
            {(task.usedMaterials || []).map((used: any, mi: number) => (
              <View key={mi} style={[styles.materialContainer, isRTL && styles.materialContainerRtl]}>
                <TouchableOpacity style={[styles.materialSelector, isRTL && styles.materialSelectorRtl]} onPress={() => openMaterialPicker(mi, 'used')}>
                  <Text style={[styles.materialSelectorText, isRTL && styles.materialSelectorTextRtl]}>{
                    used?.material?.name
                      ?? (typeof used?.material === 'string' ? (materials?.find(m => String(m._id) === String(used.material))?.name) : undefined)
                      ?? used?.material
                      ?? (t('selectMaterial') || 'Select material...')
                  }</Text>
                  <MaterialIcons name="arrow-drop-down" size={20} color="#666" style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
                </TouchableOpacity>

                <TextInput
                  ref={(el) => { usedQtyRefs.current[mi] = el; }}
                  style={[styles.input, { width: '30%' }, isRTL && styles.inputRtl]}
                  value={used.quantity !== undefined && used.quantity !== null ? String(used.quantity) : ''}
                  keyboardType="numeric"
                  onChangeText={(v) => handleMaterialQuantityChange('used', mi, v)}
                  placeholder={t('quantity') || 'Quantity'}
                  editable
                  selectTextOnFocus
                  onPressIn={() => usedQtyRefs.current[mi]?.focus && usedQtyRefs.current[mi].focus()}
                />

                <TouchableOpacity style={[styles.iconButtonRemove, isRTL && styles.iconButtonRemoveRtl]} onPress={() => removeMaterialFromTask('used', mi)}>
                  <MaterialIcons name="delete" size={20} color="#d9534f" style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        <View style={[styles.headerRowSmall, { marginTop: 12 }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={toggleProducedCollapsed} style={[styles.collapseButton, isRTL && styles.collapseButtonRtl]}>
              <MaterialIcons name={producedCollapsed ? 'expand-more' : 'expand-less'} size={20} color="#333" style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
            </TouchableOpacity>
            <Text style={[styles.label, isRTL && styles.labelRtl]}>{t('producedMaterials') || 'Produced Materials'}</Text>
          </View>
          <TouchableOpacity style={styles.iconButtonSmall} onPress={addProducedMaterialToTask}>
            <MaterialIcons name="add" size={20} color="#007AFF" style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
          </TouchableOpacity>
        </View>

        {!producedCollapsed && (
          <>
            {(task.producedMaterials || []).map((prod: any, mi: number) => (
              <View key={`prod-${mi}`} style={[styles.materialContainer, isRTL && styles.materialContainerRtl]}>
                <TouchableOpacity style={[styles.materialSelector, isRTL && styles.materialSelectorRtl]} onPress={() => openMaterialPicker(mi, 'produced')}>
                  <Text style={[styles.materialSelectorText, isRTL && styles.materialSelectorTextRtl]}>{
                    prod?.material?.name
                      ?? (typeof prod?.material === 'string' ? (materials?.find(m => String(m._id) === String(prod.material))?.name) : undefined)
                      ?? prod?.material
                      ?? (t('selectMaterial') || 'Select material...')
                  }</Text>
                  <MaterialIcons name="arrow-drop-down" size={20} color="#666" style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
                </TouchableOpacity>

                <TextInput
                  ref={(el) => { prodQtyRefs.current[mi] = el; }}
                  style={[styles.input, { width: '30%' }, isRTL && styles.inputRtl]}
                  value={prod.quantity !== undefined && prod.quantity !== null ? String(prod.quantity) : ''}
                  keyboardType="numeric"
                  onChangeText={(v) => handleMaterialQuantityChange('produced', mi, v)}
                  placeholder={t('quantity') || 'Quantity'}
                  editable
                  selectTextOnFocus
                  onPressIn={() => prodQtyRefs.current[mi]?.focus && prodQtyRefs.current[mi].focus()}
                />

                <TouchableOpacity style={[styles.iconButtonRemove, isRTL && styles.iconButtonRemoveRtl]} onPress={() => removeMaterialFromTask('produced', mi)}>
                  <MaterialIcons name="delete" size={20} color="#d9534f" style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

      </View>

      <Modal visible={activePicker !== null} animationType="slide" transparent onRequestClose={closeMaterialPicker}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, Platform.OS === 'web' ? { width: 500 } : {}]}>
            <View style={[styles.modalHeader, isRTL && styles.modalHeaderRtl]}>
              <Text style={[styles.modalTitle, isRTL && styles.modalTitleRtl]}>{t('selectMaterial') || 'Select material'}</Text>
              <Pressable onPress={closeMaterialPicker} style={styles.modalClose}><MaterialIcons name="close" size={20} color="#333" style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} /></Pressable>
            </View>
            <TextInput
              style={styles.modalSearch}
              placeholder={t('searchMaterials') || 'Search materials...'}
              value={modalSearch ?? ''}
              onChangeText={setModalSearch}
              autoFocus
              onFocus={() => { if (typeof __DEV__ !== 'undefined' && __DEV__) console.debug('[Task] modal search focused'); }}
              editable
              selectTextOnFocus
            />
            <FlatList
              data={(materials || []).filter(m => {
                const s = (modalSearch || '').trim().toLowerCase();
                if (!s) return true;
                return (m.name || '').toLowerCase().includes(s) || (m.heName || '').toLowerCase().includes(s);
              })}
              keyExtractor={(item) => item._id || item.name}
              renderItem={({ item }) => (
                <Pressable style={styles.modalItem} onPress={() => handleMaterialSelect(item)}>
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  taskCard: {
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 12,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e6e6e6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 4, marginTop: 6 },
  inputRtl: { textAlign: 'right' },
  clearButton: { position: 'absolute', top: -10, left: -10, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee' },
  clearButtonRtl: { left: undefined, right: -10 },
  headerRowSmall: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  collapseButton: { marginRight: 8 },
  collapseButtonRtl: { marginRight: 0, marginLeft: 8 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  labelRtl: { textAlign: 'right' },
  iconButtonSmall: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  materialContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, justifyContent: 'space-between' },
  materialContainerRtl: { flexDirection: 'row-reverse' },
  materialSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#ddd', padding: 8, borderRadius: 6, width: '40%' },
  materialSelectorRtl: { flexDirection: 'row-reverse' },
  materialSelectorTextRtl: { textAlign: 'right' },
  materialSelectorText: { flex: 1, color: '#333' },
  iconButtonRemove: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  iconButtonRemoveRtl: { marginLeft: 0, marginRight: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 8, maxHeight: '80%', width: '90%', padding: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalHeaderRtl: { flexDirection: 'row-reverse' },
  modalTitle: { fontSize: 16, fontWeight: '600' },
  modalTitleRtl: { textAlign: 'right' },
  modalClose: { padding: 6 },
  modalSearch: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 6, marginBottom: 8 },
  modalItem: { paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#f1f1f1' },
  modalItemText: { fontSize: 14 },
  taskContainerInner: { paddingTop: 8 },
});
