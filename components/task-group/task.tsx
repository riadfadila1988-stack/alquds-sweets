import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, FlatList, Pressable, Platform, Keyboard } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useMaterials } from '@/hooks/use-materials';
import { IUsedMaterial } from '@/types/task-group';
import { useTranslation } from '@/app/_i18n';
import DateTimePicker from '@react-native-community/datetimepicker';

interface TaskProps {
  task: any;
  onChange: (task: any) => void;
  onRemove?: () => void;
  index?: number;
}

function Task({ task, onChange, onRemove }: TaskProps) {
  const { t } = useTranslation();
  const isRTL = true;
  const { materials } = useMaterials();
  const [descHeight, setDescHeight] = React.useState<number>(100);
  // Local editable state to avoid focus issues while typing inside FlatList rows
  const [localName, setLocalName] = React.useState<string>(task?.name ?? '');
  const [localDuration, setLocalDuration] = React.useState<string>(task?.duration !== undefined && task?.duration !== null ? String(task.duration) : '');
  const [localDescription, setLocalDescription] = React.useState<string>(task?.description ?? '');
  // Local state for startAt (store as string like 'HH:mm' or ISO; will send as string or undefined)
  // Helper: convert various startAt shapes (Date, ISO string, epoch, or 'HH:mm') into 'HH:mm' string for UI
  const startAtToString = (val: any) => {
    if (val === undefined || val === null || val === '') return '';
    try {
      if (val instanceof Date) {
        if (!Number.isNaN(val.getTime())) {
          const hh = String(val.getHours()).padStart(2, '0');
          const mm = String(val.getMinutes()).padStart(2, '0');
          return `${hh}:${mm}`;
        }
      }
      if (typeof val === 'number' && Number.isFinite(val)) {
        const d = new Date(val);
        if (!Number.isNaN(d.getTime())) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
      if (typeof val === 'string') {
        // ISO timestamp
        if (val.includes('T')) {
          const d = new Date(val);
          if (!Number.isNaN(d.getTime())) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }
        // already in HH:mm
        const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(val);
        if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
        // fallback to raw string
        return val;
      }
    } catch {}
    return '';
  };

  // Prefer task.startAtString (original HH:mm) when present to avoid timezone conversion
  const [localStartAt, setLocalStartAt] = React.useState<string>(startAtToString(task?.startAtString ?? task?.startAt));
   const [showStartAtPicker, setShowStartAtPicker] = useState(false);
   // Refs used to force focus when parent touchables/gestures intercept taps
   const nameRef = useRef<any>(null);
   const durationRef = useRef<any>(null);
   const startAtRef = useRef<any>(null);
   const descRef = useRef<any>(null);
   const [usedQtyRefs] = React.useState(() => ({} as Record<number, any>));
   const prodQtyRefs = useRef<Record<number, any>>({});
   // Local copies of used/produced materials so we can update UI immediately
   const [localUsedMaterials, setLocalUsedMaterials] = React.useState<any[]>(task?.usedMaterials ? [...task.usedMaterials] : []);
   const [localProducedMaterials, setLocalProducedMaterials] = React.useState<any[]>(task?.producedMaterials ? [...task.producedMaterials] : []);
   const [materialsCollapsed, setMaterialsCollapsed] = useState(false);
   const [producedCollapsed, setProducedCollapsed] = useState(false);
   const [activePicker, setActivePicker] = useState<{ section: 'used' | 'produced'; index: number } | null>(null);
   const [modalSearch, setModalSearch] = useState('');

   // Sync local state when the task identity changes (new task row) to avoid overwriting
   // user's in-progress edits when parent updates other fields.
   React.useEffect(() => {
      const key = (task && (task._key ?? task._id)) ?? null;
      setLocalName(task?.name ?? '');
      setLocalDuration(task?.duration !== undefined && task?.duration !== null ? String(task.duration) : '');
      setLocalDescription(task?.description ?? '');
      setLocalStartAt(startAtToString(task?.startAtString ?? task?.startAt));
      // initialize local materials copies when task identity changes
      setLocalUsedMaterials(task?.usedMaterials ? [...task.usedMaterials] : []);
      setLocalProducedMaterials(task?.producedMaterials ? [...task.producedMaterials] : []);
      // Only run when identity changes
    }, [ (task && (task._key ?? task._id)) ]);

    // NOTE: we intentionally only initialize localStartAt when the task identity changes
    // (see effect above) and avoid syncing on every prop update so user edits are not
    // unexpectedly overwritten by parent re-renders.

    // Helper: parse a stored time string to a Date for the picker. Accepts ISO or 'HH:mm'.
    const parseToDate = (v?: string) => {
      if (!v) return new Date();
      // If ISO-like
      if (v.includes('T')) {
        const d = new Date(v);
        if (!isNaN(d.getTime())) return d;
      }
      // If HH:mm
      const m = v.match(/^(\d{1,2}):(\d{2})$/);
      if (m) {
        const now = new Date();
        now.setHours(Number(m[1]));
        now.setMinutes(Number(m[2]));
        now.setSeconds(0);
        now.setMilliseconds(0);
        return now;
      }
      return new Date();
    };

   const formatTimeForDisplay = (v?: string) => {
     if (!v) return '';
     if (v.includes('T')) {
       const d = new Date(v);
       if (!isNaN(d.getTime())) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
     }
     const m = v.match(/^(\d{1,2}):(\d{2})$/);
     if (m) {
       const hh = m[1].padStart(2, '0');
       return `${hh}:${m[2]}`;
     }
     return v;
   };

   const handleFieldChange = (field: string, value: any) => {
    // Update local state and defer parent update to onBlur for stable typing experience
    if (field === 'name') setLocalName(String(value ?? ''));
    else if (field === 'duration') setLocalDuration(String(value ?? ''));
    else if (field === 'description') setLocalDescription(String(value ?? ''));
    else if (field === 'startAt') setLocalStartAt(String(value ?? ''));
    else {
      // for other fields, update immediately
      onChange({ ...task, [field]: value });
    }
  };
  // We intentionally avoid pushing parent updates on every keystroke because that can cause
  // the FlatList row to re-render and reset focus/selection. Instead, we update parent only
  // when the input blurs (flushLocalToParent). This keeps typing smooth and reliable.

  const flushLocalToParent = React.useCallback((_maybeField?: string) => {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        try { console.log('[Task] flushLocalToParent', { key: task?._key ?? task?._id, localStartAt, field: _maybeField }); } catch {}
      }
      // Convert duration to number on flush
      const durationNum = localDuration !== '' ? Number(localDuration) : 0;
      const payload: any = {
        ...task,
        name: String(localName ?? ''),
        duration: Number.isFinite(durationNum) ? durationNum : 0,
        description: String(localDescription ?? ''),
      };
      // include startAt only when provided (string like 'HH:mm' or ISO)
      if (localStartAt !== '') payload.startAt = localStartAt;
      else payload.startAt = undefined;
      // always include startAtString so the exact HH:mm is preserved
      if (localStartAt !== '') payload.startAtString = localStartAt;
      else payload.startAtString = undefined;
      // include materials from local state so parent sees latest immediate changes
      payload.usedMaterials = (localUsedMaterials || []).map((um: any) => ({ ...um }));
      payload.producedMaterials = (localProducedMaterials || []).map((pm: any) => ({ ...pm }));
      // ensure payload contains a stable key for parent lookup
      try { payload._key = task?._key ?? task?._id ?? payload._key; } catch {}
      onChange(payload);
      // No-op: avoid touching prop-sync refs here to prevent clobbering user edits.
    }, [localName, localDuration, localDescription, localStartAt, onChange, task, localUsedMaterials, localProducedMaterials]);

  // Immediate updater used when typing into the startAt input so the parent reflects
  // the change right away. This prevents the UI from appearing to revert after parent
  // re-renders replace the component's props.
  const updateStartAtImmediate = (val: string) => {
    setLocalStartAt(val);
    const durationNum = localDuration !== '' ? Number(localDuration) : 0;
    const payload: any = {
      ...task,
      name: String(localName ?? ''),
      duration: Number.isFinite(durationNum) ? durationNum : 0,
      description: String(localDescription ?? ''),
      startAt: val !== '' ? val : undefined,
      startAtString: val !== '' ? val : undefined,
      // include local materials so immediate update keeps them in sync
      usedMaterials: (localUsedMaterials || []).map((um: any) => ({ ...um })),
      producedMaterials: (localProducedMaterials || []).map((pm: any) => ({ ...pm })),
    };
    // ensure payload contains a stable key for parent lookup
    try { payload._key = task?._key ?? task?._id ?? payload._key; } catch {}
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      try { console.log('[Task] updateStartAtImmediate', { key: task?._key ?? task?._id, val }); } catch {}
    }
    onChange(payload);
  };

  // Robust handler for the native DateTimePicker change event
  const onStartAtPickerChange = (event: any, date?: Date | undefined) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      try { console.log('[Task] onStartAtPickerChange', { event, date, key: task?._key ?? task?._id }); } catch {}
    }
    // On Android the event includes a nativeEvent.action or type indicating 'dismissed' vs 'set'
    if (Platform.OS === 'android') {
      // Close the picker on Android regardless of outcome
      setShowStartAtPicker(false);
      const action = event?.type ?? event?.nativeEvent?.action;
      if (action === 'dismissed' || action === 'dismiss') return;
      // Some versions send undefined event.type and date === undefined when dismissed
      if (!date) return;
    }

    // For iOS the picker stays open until the user closes it; onChange here may be called with a Date
    if (!date) return;
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const val = `${hh}:${mm}`;
    setLocalStartAt(val);
    // Use the immediate updater so we don't rely on React state being flushed
    updateStartAtImmediate(val);
  };

  const toggleMaterialsCollapsed = () => setMaterialsCollapsed(v => !v);
  const toggleProducedCollapsed = () => setProducedCollapsed(v => !v);

  const addMaterialToTask = () => {
      const used = [...(localUsedMaterials || [])];
      if (materials && materials.length > 0) used.push({ material: materials[0], quantity: 1 } as IUsedMaterial);
      else used.push({ material: undefined, quantity: 1 } as any);
      setLocalUsedMaterials(used);
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        try { console.log('[Task] addMaterialToTask', { key: task?._key ?? task?._id, used }); } catch {}
      }
      // flush immediately so parent has the new item
      flushLocalToParent('usedMaterials');
      setMaterialsCollapsed(false);
    };

  const addProducedMaterialToTask = () => {
    const produced = [...(localProducedMaterials || [])];
    if (materials && materials.length > 0) produced.push({ material: materials[0], quantity: 1 } as IUsedMaterial);
    else produced.push({ material: undefined, quantity: 1 } as any);
    setLocalProducedMaterials(produced);
    flushLocalToParent('producedMaterials');
    setProducedCollapsed(false);
  };

  const removeMaterialFromTask = (section: 'used' | 'produced', index: number) => {
    if (section === 'used') {
      const used = [...(localUsedMaterials || [])];
      used.splice(index, 1);
      setLocalUsedMaterials(used);
      flushLocalToParent('usedMaterials');
    } else {
      const produced = [...(localProducedMaterials || [])];
      produced.splice(index, 1);
      setLocalProducedMaterials(produced);
      flushLocalToParent('producedMaterials');
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
        const used = [...(localUsedMaterials || [])];
        used[index] = { ...used[index], material };
        setLocalUsedMaterials(used);
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          try { console.log('[Task] handleMaterialSelect used', { key: task?._key ?? task?._id, index, material }); } catch {}
        }
        flushLocalToParent('usedMaterials');
      } else {
        const produced = [...(localProducedMaterials || [])];
        produced[index] = { ...produced[index], material };
        setLocalProducedMaterials(produced);
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          try { console.log('[Task] handleMaterialSelect produced', { key: task?._key ?? task?._id, index, material }); } catch {}
        }
        flushLocalToParent('producedMaterials');
      }
      closeMaterialPicker();
    };

  const handleMaterialQuantityChange = (section: 'used' | 'produced', index: number, quantity: any) => {
    // store raw input (string) so the TextInput remains controlled and typing isn't interrupted;
    // numeric coercion can be done later when saving or computing totals.
    if (section === 'used') {
      const used = [...(localUsedMaterials || [])];
      used[index] = { ...used[index], quantity };
      setLocalUsedMaterials(used);
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        try { console.log('[Task] handleMaterialQuantityChange used', { key: task?._key ?? task?._id, index, quantity }); } catch {}
      }
      // flush only this field
      flushLocalToParent('usedMaterials');
    } else {
      const produced = [...(localProducedMaterials || [])];
      produced[index] = { ...produced[index], quantity };
      setLocalProducedMaterials(produced);
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        try { console.log('[Task] handleMaterialQuantityChange produced', { key: task?._key ?? task?._id, index, quantity }); } catch {}
      }
      flushLocalToParent('producedMaterials');
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
          value={localName}
          onChangeText={(v) => handleFieldChange('name', v)}
          onBlur={() => flushLocalToParent('name')}
          onFocus={() => { /* focus */ }}
          onPressIn={() => nameRef.current?.focus && nameRef.current.focus()}
          editable
          selectTextOnFocus
        />

        <TextInput
          ref={durationRef}
          style={[styles.input, isRTL && styles.inputRtl]}
          placeholder={t('durationInMinutes') || 'Duration (minutes)'}
          value={localDuration}
          keyboardType="numeric"
          onChangeText={(v) => handleFieldChange('duration', v)}
          onBlur={() => flushLocalToParent('duration')}
          onFocus={() => { /* focus */ }}
          onPressIn={() => durationRef.current?.focus && durationRef.current.focus()}
          editable
          selectTextOnFocus
        />
        {/* Start At: show formatted time inside a TextInput and open native time picker on focus/press */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TextInput
             ref={startAtRef}
             style={[styles.input, { flex: 1 }, isRTL && styles.inputRtl]}
             placeholder={t('startAt') || 'Start At'}
             // show localStartAt (edited value) or fall back to the task prop so newly-added
             // tasks display their default startAt immediately
             value={localStartAt ?? (task?.startAt !== undefined && task?.startAt !== null ? String(task.startAt) : '')}
             onChangeText={(v) => { if (typeof __DEV__ !== 'undefined' && __DEV__) try { console.log('[Task] startAt onChangeText', v); } catch{}; updateStartAtImmediate(String(v ?? '')); }}
             onBlur={() => flushLocalToParent('startAt')}
             editable
             selectTextOnFocus
             keyboardType={'default'}
             autoCorrect={false}
             autoCapitalize={'none'}
             returnKeyType={'done'}
             onSubmitEditing={() => flushLocalToParent('startAt')}
           />
           {/* Clock button to open native time picker */}
           <TouchableOpacity style={[styles.iconButtonSmall, { marginLeft: 8 }]} onPress={() => { Keyboard.dismiss(); setShowStartAtPicker(true); }}>
             <MaterialIcons name="access-time" size={20} color="#007AFF" style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
           </TouchableOpacity>
           {localStartAt ? (
             <TouchableOpacity
               style={[styles.iconButtonRemove, isRTL && styles.iconButtonRemoveRtl, { marginLeft: 8 }]}
               onPress={() => {
                 if (typeof __DEV__ !== 'undefined' && __DEV__) {
                   try { console.log('[Task] clearStartAt pressed', { key: task?._key ?? task?._id, prevLocal: localStartAt }); } catch {}
                 }
                 // close native picker if open
                 try { setShowStartAtPicker(false); } catch {}
                 updateStartAtImmediate('');
               }}
             >
               <MaterialIcons name="close" size={18} color="#666" />
             </TouchableOpacity>
           ) : null}
         </View>
         {showStartAtPicker && (
           <DateTimePicker
             value={parseToDate(localStartAt)}
             mode={'time'}
             is24Hour={true}
             display={Platform.OS === 'ios' ? 'spinner' : 'default'}
             onChange={onStartAtPickerChange}
           />
         )}
        <TextInput
          ref={descRef}
          style={[styles.input, isRTL && styles.inputRtl, styles.textarea, isRTL && styles.textareaRtl, { height: descHeight, textAlignVertical: 'top' }]}
          placeholder={t('description') || 'Description'}
          value={localDescription}
          onChangeText={(v) => handleFieldChange('description', v)}
          onBlur={() => flushLocalToParent('description')}
          onFocus={() => { /* focus */ }}
          onPressIn={() => descRef.current?.focus && descRef.current.focus()}
          editable
          selectTextOnFocus
          multiline={true}
          numberOfLines={4}
          blurOnSubmit={false}
          returnKeyType="default"
          onContentSizeChange={(e) => {
            const h = e.nativeEvent.contentSize?.height || 100;
            // add a small padding so text isn't clipped
            const newH = Math.max(80, Math.min(300, Math.round(h + 6)));
            if (newH !== descHeight) setDescHeight(newH);
          }}
        />

        <View style={styles.headerRowSmall}>
          <View style={styles.headerLeft}>
            <Text style={[styles.label, isRTL && styles.labelRtl]}>{t('usedMaterials') || 'Used Materials'}</Text>
            <TouchableOpacity onPress={toggleMaterialsCollapsed} style={[styles.collapseButton, isRTL && styles.collapseButtonRtl]}>
              <MaterialIcons name={materialsCollapsed ? 'expand-more' : 'expand-less'} size={20} color="#333" style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.iconButtonSmall} onPress={addMaterialToTask}>
            <MaterialIcons name="add" size={20} color="#007AFF" style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
          </TouchableOpacity>
        </View>

        {!materialsCollapsed && (
          <>
            {(localUsedMaterials || []).map((used: any, mi: number) => (
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
            <Text style={[styles.label, isRTL && styles.labelRtl]}>{t('producedMaterials') || 'Produced Materials'}</Text>
            <TouchableOpacity onPress={toggleProducedCollapsed} style={[styles.collapseButton, isRTL && styles.collapseButtonRtl]}>
              <MaterialIcons name={producedCollapsed ? 'expand-more' : 'expand-less'} size={20} color="#333" style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.iconButtonSmall} onPress={addProducedMaterialToTask}>
            <MaterialIcons name="add" size={20} color="#007AFF" style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
          </TouchableOpacity>
        </View>

        {!producedCollapsed && (
          <>
            {(localProducedMaterials || []).map((prod: any, mi: number) => (
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
              onFocus={() => { /* focus */ }}
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

// Memoize the Task component to avoid re-renders/remounts when parent re-renders without changes
export default React.memo(Task);

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
  textarea: { height: 100, paddingTop: 8, paddingBottom: 8, textAlignVertical: 'top' },
  inputRtl: { textAlign: 'right' },
  textareaRtl: { textAlign: 'right' },
  clearButton: { position: 'absolute', top: -10, left: -10, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee' },
  clearButtonRtl: { left: undefined, right: -10 },
  headerRowSmall: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
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
