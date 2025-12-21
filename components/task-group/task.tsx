import React, {useState, useRef, useImperativeHandle, forwardRef} from 'react';
import {View, Text, StyleSheet, FlatList, Pressable, Platform, Keyboard, TextInput as RNTextInput, Animated} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {IUsedMaterial} from '@/types/task-group';
import {useTranslation} from '@/app/_i18n';
import DateTimePicker from '@react-native-community/datetimepicker';
// Use react-native-paper components for inputs/buttons/modal
import {
    TextInput as PaperTextInput,
    IconButton as PaperIconButton,
    TouchableRipple,
    Portal,
    Modal as PaperModal
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';

interface TaskProps {
    task: any;
    onChange: (task: any) => void;
    onRemove?: () => void;
    index?: number;
    materials?: any[]; // pass materials from parent to avoid calling hook per row
}

// Use forwardRef so parent can call `flush`.
const TaskInner = ({task, onChange, onRemove, materials}: TaskProps, ref: any) => {
    const {t} = useTranslation();
    const isRTL = true;
    // materials are provided by parent TaskGroupForm via props; fallback to empty array
    const _materials = materials ?? [];
    // stable identity used for effect dependency checks
    const taskKey = (task && (task._key ?? task._id)) ?? null;
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
        } catch {
        }
        return '';
    };

    // Prefer task.startAtString (original HH:mm) when present to avoid timezone conversion
    const [localStartAt, setLocalStartAt] = React.useState<string>(startAtToString(task?.startAtString ?? task?.startAt));
    const [showStartAtPicker, setShowStartAtPicker] = useState(false);
    // Refs used to force focus when parent touchables/gestures intercept taps
    const nameRef = useRef<any>(null);
    const durationRef = useRef<any>(null);
    const descRef = useRef<any>(null);
    // refs for quantity inputs (useRef so we can access `.current`)
    const usedQtyRefs = useRef<Record<number, any>>({});
    const prodQtyRefs = useRef<Record<number, any>>({});
    // Local copies of used/produced materials so we can update UI immediately
    const [localUsedMaterials, setLocalUsedMaterials] = React.useState<any[]>(task?.usedMaterials ? [...task.usedMaterials] : []);
    const [localProducedMaterials, setLocalProducedMaterials] = React.useState<any[]>(task?.producedMaterials ? [...task.producedMaterials] : []);
    const [materialsCollapsed, setMaterialsCollapsed] = useState(false);
    const [producedCollapsed, setProducedCollapsed] = useState(false);
    const [activePicker, setActivePicker] = useState<{ section: 'used' | 'produced'; index: number } | null>(null);
    const [modalSearch, setModalSearch] = useState('');

    // Fun animations
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const bounceAnim = useRef(new Animated.Value(1)).current;

    // Entrance animation
    React.useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
        }).start();
    }, [scaleAnim]);

    // Bounce animation for interactions
    const triggerBounce = () => {
        Animated.sequence([
            Animated.timing(bounceAnim, {
                toValue: 1.05,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(bounceAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();
    };

    // Sync local state when the task identity changes (new task row) to avoid overwriting
    // user's in-progress edits when parent updates other fields.
    React.useEffect(() => {
        setLocalName(task?.name ?? '');
        setLocalDuration(task?.duration !== undefined && task?.duration !== null ? String(task.duration) : '');
        setLocalDescription(task?.description ?? '');
        setLocalStartAt(startAtToString(task?.startAtString ?? task?.startAt));
        // initialize local materials copies when task identity changes
        setLocalUsedMaterials(task?.usedMaterials ? [...task.usedMaterials] : []);
        setLocalProducedMaterials(task?.producedMaterials ? [...task.producedMaterials] : []);
        // Only run when identity changes
    }, [taskKey, task]);

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

    const handleFieldChange = (field: string, value: any) => {
        // Update local state and defer parent update to onBlur for stable typing experience
        if (field === 'name') setLocalName(String(value ?? ''));
        else if (field === 'duration') setLocalDuration(String(value ?? ''));
        else if (field === 'description') setLocalDescription(String(value ?? ''));
        else if (field === 'startAt') setLocalStartAt(String(value ?? ''));
        else {
            // for other fields, update immediately
            onChange({...task, [field]: value});
        }
    };
    // We intentionally avoid pushing parent updates on every keystroke because that can cause
    // the FlatList row to re-render and reset focus/selection. Instead, we update parent only
    // when the input blurs (flushLocalToParent). This keeps typing smooth and reliable.

    const flushLocalToParent = React.useCallback((_maybeField?: string, data?: { used?: any[], produced?: any[] }) => {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
            try {
                console.log('[Task] flushLocalToParent', {
                    key: task?._key ?? task?._id,
                    localStartAt,
                    field: _maybeField
                });
            } catch {
            }
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
        payload.usedMaterials = (data?.used ?? localUsedMaterials ?? []).map((um: any) => ({...um}));
        payload.producedMaterials = (data?.produced ?? localProducedMaterials ?? []).map((pm: any) => ({...pm}));
        // ensure payload contains a stable key for parent lookup
        try {
            payload._key = task?._key ?? task?._id ?? payload._key;
        } catch {
        }
        // Mark this as a commit event coming from blur/focus-out
        payload.__commit = true;
        onChange(payload);
        // return the payload so parent can collect flushed values synchronously
        return payload;
    }, [localName, localDuration, localDescription, localStartAt, onChange, task, localUsedMaterials, localProducedMaterials]);

    // expose flush method to parent via ref
    useImperativeHandle(ref, () => ({
        flush: () => flushLocalToParent(),
    }));

    // Immediate updater used when typing into the startAt input so the parent reflects
    // the change right away. This prevents the UI from appearing to revert after parent
    // re-renders replace the component's props.
    const updateStartAtImmediate = (val: string, commit?: boolean) => {
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
            usedMaterials: (localUsedMaterials || []).map((um: any) => ({...um})),
            producedMaterials: (localProducedMaterials || []).map((pm: any) => ({...pm})),
        };
        // ensure payload contains a stable key for parent lookup
        try {
            payload._key = task?._key ?? task?._id ?? payload._key;
        } catch {
        }
        if (commit) payload.__commit = true;
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
            try {
                console.log('[Task] updateStartAtImmediate', {key: task?._key ?? task?._id, val, commit});
            } catch {
            }
        }
        onChange(payload);
    };

    // Robust handler for the native DateTimePicker change event
    const onStartAtPickerChange = (event: any, date?: Date | undefined) => {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
            try {
                console.log('[Task] onStartAtPickerChange', {event, date, key: task?._key ?? task?._id});
            } catch {
            }
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
        // Use the immediate updater; mark as a commit so parent can submit
        updateStartAtImmediate(val, true);
    };

    const toggleMaterialsCollapsed = () => setMaterialsCollapsed(v => !v);
    const toggleProducedCollapsed = () => setProducedCollapsed(v => !v);

    const addMaterialToTask = () => {
        const used = [...(localUsedMaterials || [])];
        if (_materials && _materials.length > 0) used.push({material: _materials[0], quantity: 1} as IUsedMaterial);
        else used.push({material: undefined, quantity: 1} as any);
        setLocalUsedMaterials(used);
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
            try {
                console.log('[Task] addMaterialToTask', {key: task?._key ?? task?._id, used});
            } catch {
            }
        }
        // flush immediately so parent has the new item
        flushLocalToParent('usedMaterials', {used});
        setMaterialsCollapsed(false);
    };

    const addProducedMaterialToTask = () => {
        const produced = [...(localProducedMaterials || [])];
        if (_materials && _materials.length > 0) produced.push({material: _materials[0], quantity: 1} as IUsedMaterial);
        else produced.push({material: undefined, quantity: 1} as any);
        setLocalProducedMaterials(produced);
        flushLocalToParent('producedMaterials', {produced});
        setProducedCollapsed(false);
    };

    const removeMaterialFromTask = (section: 'used' | 'produced', index: number) => {
        if (section === 'used') {
            const used = [...(localUsedMaterials || [])];
            used.splice(index, 1);
            setLocalUsedMaterials(used);
            flushLocalToParent('usedMaterials', {used});
        } else {
            const produced = [...(localProducedMaterials || [])];
            produced.splice(index, 1);
            setLocalProducedMaterials(produced);
            flushLocalToParent('producedMaterials', {produced});
        }
    };

    const openMaterialPicker = (index: number, section: 'used' | 'produced') => {
        setActivePicker({section, index});
        setModalSearch('');
    };

    const closeMaterialPicker = () => {
        setActivePicker(null);
        setModalSearch('');
    };

    const handleMaterialSelect = (material: any) => {
        if (!activePicker) return;
        const {section, index} = activePicker;
        if (section === 'used') {
            const used = [...(localUsedMaterials || [])];
            used[index] = {...used[index], material};
            setLocalUsedMaterials(used);
            if (typeof __DEV__ !== 'undefined' && __DEV__) {
                try {
                    console.log('[Task] handleMaterialSelect used', {key: task?._key ?? task?._id, index, material});
                } catch {
                }
            }
            flushLocalToParent('usedMaterials', {used});
        } else {
            const produced = [...(localProducedMaterials || [])];
            produced[index] = {...produced[index], material};
            setLocalProducedMaterials(produced);
            if (typeof __DEV__ !== 'undefined' && __DEV__) {
                try {
                    console.log('[Task] handleMaterialSelect produced', {
                        key: task?._key ?? task?._id,
                        index,
                        material
                    });
                } catch {
                }
            }
            flushLocalToParent('producedMaterials', {produced});
        }
        closeMaterialPicker();
    };

    const handleMaterialQuantityChange = (section: 'used' | 'produced', index: number, quantity: any) => {
        // store raw input (string) so the TextInput remains controlled and typing isn't interrupted;
        // numeric coercion can be done later when saving or computing totals.
        if (section === 'used') {
            const used = [...(localUsedMaterials || [])];
            used[index] = {...used[index], quantity};
            setLocalUsedMaterials(used);
            if (typeof __DEV__ !== 'undefined' && __DEV__) {
                try {
                    console.log('[Task] handleMaterialQuantityChange used', {
                        key: task?._key ?? task?._id,
                        index,
                        quantity
                    });
                } catch {
                }
            }
            // flush only this field
            flushLocalToParent('usedMaterials', {used});
        } else {
            const produced = [...(localProducedMaterials || [])];
            produced[index] = {...produced[index], quantity};
            setLocalProducedMaterials(produced);
            if (typeof __DEV__ !== 'undefined' && __DEV__) {
                try {
                    console.log('[Task] handleMaterialQuantityChange produced', {
                        key: task?._key ?? task?._id,
                        index,
                        quantity
                    });
                } catch {
                }
            }
            flushLocalToParent('producedMaterials', {produced});
        }
    };

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }, { scale: bounceAnim }] }}>
      <LinearGradient
        colors={["#667eea", "#764ba2", "#f093fb", "#4facfe"]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.taskCardGradient}
      >
        <View style={styles.taskCardInner}>
       {onRemove ? (
         <Pressable
           onPress={() => {
             triggerBounce();
             onRemove();
           }}
           style={[styles.clearButton, isRTL && styles.clearButtonRtl]}
         >
           <LinearGradient colors={["#ff6b6b", "#ee5a6f"]} style={styles.deleteGradient}>
             <MaterialIcons name="delete-sweep" size={22} color="#fff" style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
           </LinearGradient>
         </Pressable>
       ) : null}

       <View style={styles.taskContainerInner}>
                <PaperTextInput
                    ref={nameRef}
                    mode="outlined"
                    label={t('taskName') || 'Task Name'}
                    placeholder={t('taskName') || 'Task Name'}
                    value={localName}
                    onChangeText={(v) => handleFieldChange('name', v)}
                    onBlur={() => flushLocalToParent('name')}
                    onFocus={() => {
                        triggerBounce();
                    }}
                    style={[isRTL && styles.inputRtl]}
                    theme={{
                        colors: {
                            primary: '#667eea',
                            background: '#ffffff',
                        }
                    }}
                    editable
                />

                {/* Compact row: Duration and Start At placed side-by-side for a cleaner layout */}
                <View style={styles.rowSplit}>
                    <View style={styles.column}>
                        <PaperTextInput
                            ref={durationRef}
                            mode="outlined"
                            label={t('durationInMinutes') || 'Duration ⏱️'}
                            value={localDuration}
                            keyboardType="numeric"
                            onChangeText={(v) => handleFieldChange('duration', v)}
                            onBlur={() => flushLocalToParent('duration')}
                            style={[styles.durationInput, isRTL && styles.inputRtl]}
                            theme={{
                                colors: {
                                    primary: '#4facfe',
                                    background: '#ffffff',
                                }
                            }}
                            editable
                        />
                    </View>


                    <View style={styles.column}>
                        {/* Modern Time Picker Card */}
                        <Pressable
                            onPress={() => {
                                triggerBounce();
                                Keyboard.dismiss();
                                setShowStartAtPicker(true);
                            }}
                            style={[
                                styles.timePickerCard,
                                localStartAt && styles.timePickerCardActive
                            ]}
                        >
                            <View style={styles.timePickerContent}>
                                {/* Clock Icon */}
                                <View style={[
                                    styles.timeIconWrapper,
                                    localStartAt && styles.timeIconWrapperActive
                                ]}>
                                    <MaterialIcons
                                        name="schedule"
                                        size={20}
                                        color={localStartAt ? "#fff" : "#94a3b8"}
                                        style={isRTL ? {transform: [{scaleX: -1}]} : undefined}
                                    />
                                </View>

                                {/* Time Display */}
                                <View style={styles.timeTextWrapper}>
                                    <Text style={[styles.timeLabel, localStartAt && styles.timeLabelActive]}>
                                        {t('startAt') || 'Start At'} ⏰
                                    </Text>
                                    <Text style={[styles.timeValue, localStartAt && styles.timeValueActive]}>
                                        {localStartAt || (t('tapToSelect') || 'Tap to select time')}
                                    </Text>
                                </View>

                                {/* Clear Button or Arrow */}
                                {localStartAt ? (
                                    <Pressable
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            if (typeof __DEV__ !== 'undefined' && __DEV__) {
                                                try {
                                                    console.log('[Task] clearStartAt pressed', {
                                                        key: task?._key ?? task?._id,
                                                        prevLocal: localStartAt
                                                    });
                                                } catch {
                                                }
                                            }
                                            try {
                                                setShowStartAtPicker(false);
                                            } catch {
                                            }
                                            updateStartAtImmediate('');
                                        }}
                                        style={styles.timeClearButton}
                                    >
                                        <MaterialIcons name="close" size={18} color="#fff"/>
                                    </Pressable>
                                ) : (
                                    <MaterialIcons
                                        name="arrow-drop-down"
                                        size={28}
                                        color="#94a3b8"
                                        style={isRTL ? {transform: [{scaleX: -1}]} : undefined}
                                    />
                                )}
                            </View>
                        </Pressable>

                        {showStartAtPicker && (
                            <DateTimePicker
                                value={parseToDate(localStartAt)}
                                mode={'time'}
                                is24Hour={true}
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={onStartAtPickerChange}
                            />
                        )}
                    </View>
                </View>

                <PaperTextInput
                    ref={descRef}
                    mode="outlined"
                    label={t('description') || 'Description'}
                    placeholder={t('description') || 'Description'}
                    value={localDescription}
                    onChangeText={(v) => handleFieldChange('description', v)}
                    onBlur={() => flushLocalToParent('description')}
                    onFocus={() => { /* focus */
                    }}
                    style={[isRTL && styles.inputRtl, isRTL && styles.textareaRtl, {
                        height: descHeight,
                        textAlignVertical: 'top'
                    }]}
                    theme={{
                        colors: {
                            primary: '#764ba2',
                            background: '#ffffff',
                        }
                    }}
                    editable
                    multiline={true}
                    numberOfLines={4}
                    blurOnSubmit={false}
                    returnKeyType="default"
                    onContentSizeChange={(e: any) => {
                        const h = e.nativeEvent.contentSize?.height || 100;
                        // add a small padding so text isn't clipped
                        const newH = Math.max(80, Math.min(300, Math.round(h + 6)));
                        if (newH !== descHeight) setDescHeight(newH);
                    }}
                />

                <View style={styles.headerRowSmall}>
                    <View style={styles.headerLeft}>
                        <Text
                            style={[styles.label, isRTL && styles.labelRtl]}>{t('usedMaterials') || 'Used Materials'}</Text>
                        <TouchableRipple onPress={toggleMaterialsCollapsed}
                                         style={[styles.collapseButton, isRTL && styles.collapseButtonRtl]}>
                            <View>
                                <MaterialIcons name={materialsCollapsed ? 'expand-more' : 'expand-less'} size={20}
                                               color="#333" style={isRTL ? {transform: [{scaleX: -1}]} : undefined}/>
                            </View>
                        </TouchableRipple>
                    </View>
                    <Pressable onPress={() => {
                        triggerBounce();
                        addMaterialToTask();
                    }} style={styles.addButton}>
                        <LinearGradient colors={["#4facfe", "#00f2fe"]} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.addButtonGradient}>
                            <MaterialIcons name="add-circle" size={24} color="#fff" style={isRTL ? {transform: [{scaleX: -1}]} : undefined}/>
                        </LinearGradient>
                    </Pressable>
                </View>

                {!materialsCollapsed && (
                    <>
                        {(localUsedMaterials || []).map((used: any, mi: number) => (
                            <View key={mi} style={[styles.materialContainer, isRTL && styles.materialContainerRtl]}>
                                <TouchableRipple style={[styles.materialSelector, isRTL && styles.materialSelectorRtl]}
                                                 onPress={() => openMaterialPicker(mi, 'used')}>
                                    <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <Text
                                            style={[styles.materialSelectorText, isRTL && styles.materialSelectorTextRtl]}>{
                                            used?.material?.name
                                            ?? (typeof used?.material === 'string' ? (_materials?.find(m => String(m._id) === String(used.material))?.name) : undefined)
                                            ?? used?.material
                                            ?? (t('selectMaterial') || 'Select material...')
                                        }</Text>
                                        <MaterialIcons name="arrow-drop-down" size={20} color="#666"
                                                       style={isRTL ? {transform: [{scaleX: -1}]} : undefined}/>
                                    </View>
                                </TouchableRipple>

                                <PaperTextInput
                                    ref={(el: RNTextInput | null) => {
                                        usedQtyRefs.current[mi] = el;
                                    }}
                                    mode="outlined"
                                    value={used.quantity !== undefined && used.quantity !== null ? String(used.quantity) : ''}
                                    keyboardType="numeric"
                                    onChangeText={(v) => handleMaterialQuantityChange('used', mi, v)}
                                    label={t('quantity') || 'Quantity'}
                                    style={[styles.input, {width: '30%'}, isRTL && styles.inputRtl]}
                                    editable
                                    selectTextOnFocus
                                />

                                <PaperIconButton icon={() => <MaterialIcons name="delete" size={20} color="#d9534f"
                                                                            style={isRTL ? {transform: [{scaleX: -1}]} : undefined}/>}
                                                 style={[styles.iconButtonRemove, isRTL && styles.iconButtonRemoveRtl]}
                                                 onPress={() => removeMaterialFromTask('used', mi)}/>
                            </View>
                        ))}
                    </>
                )}

                <View style={[styles.headerRowSmall, {marginTop: 12}]}>
                    <View style={styles.headerLeft}>
                        <Text
                            style={[styles.label, isRTL && styles.labelRtl]}>{t('producedMaterials') || 'Produced Materials'}</Text>
                        <TouchableRipple onPress={toggleProducedCollapsed}
                                         style={[styles.collapseButton, isRTL && styles.collapseButtonRtl]}>
                            <View>
                                <MaterialIcons name={producedCollapsed ? 'expand-more' : 'expand-less'} size={20}
                                               color="#333" style={isRTL ? {transform: [{scaleX: -1}]} : undefined}/>
                            </View>
                        </TouchableRipple>
                    </View>
                    <Pressable onPress={() => {
                        triggerBounce();
                        addProducedMaterialToTask();
                    }} style={styles.addButton}>
                        <LinearGradient colors={["#f093fb", "#f5576c"]} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.addButtonGradient}>
                            <MaterialIcons name="add-circle" size={24} color="#fff" style={isRTL ? {transform: [{scaleX: -1}]} : undefined}/>
                        </LinearGradient>
                    </Pressable>
                </View>

                {!producedCollapsed && (
                    <>
                        {(localProducedMaterials || []).map((prod: any, mi: number) => (
                            <View key={`prod-${mi}`}
                                  style={[styles.materialContainer, isRTL && styles.materialContainerRtl]}>
                                <TouchableRipple style={[styles.materialSelector, isRTL && styles.materialSelectorRtl]}
                                                 onPress={() => openMaterialPicker(mi, 'produced')}>
                                    <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <Text
                                            style={[styles.materialSelectorText, isRTL && styles.materialSelectorTextRtl]}>{
                                            prod?.material?.name
                                            ?? (typeof prod?.material === 'string' ? (_materials?.find(m => String(m._id) === String(prod.material))?.name) : undefined)
                                            ?? prod?.material
                                            ?? (t('selectMaterial') || 'Select material...')
                                        }</Text>
                                        <MaterialIcons name="arrow-drop-down" size={20} color="#666"
                                                       style={isRTL ? {transform: [{scaleX: -1}]} : undefined}/>
                                    </View>
                                </TouchableRipple>

                                <PaperTextInput
                                    ref={(el: RNTextInput | null) => {
                                        prodQtyRefs.current[mi] = el;
                                    }}
                                    mode="outlined"
                                    value={prod.quantity !== undefined && prod.quantity !== null ? String(prod.quantity) : ''}
                                    keyboardType="numeric"
                                    onChangeText={(v) => handleMaterialQuantityChange('produced', mi, v)}
                                    label={t('quantity') || 'Quantity'}
                                    style={[styles.input, {width: '30%'}, isRTL && styles.inputRtl]}
                                    editable
                                    selectTextOnFocus
                                />

                                <PaperIconButton icon={() => <MaterialIcons name="delete" size={20} color="#d9534f"
                                                                            style={isRTL ? {transform: [{scaleX: -1}]} : undefined}/>}
                                                 style={[styles.iconButtonRemove, isRTL && styles.iconButtonRemoveRtl]}
                                                 onPress={() => removeMaterialFromTask('produced', mi)}/>
                            </View>
                        ))}
                    </>
                )}

            </View>

            <Portal>
                <PaperModal visible={activePicker !== null} onDismiss={closeMaterialPicker}
                            contentContainerStyle={[styles.modalContent, Platform.OS === 'web' ? {width: 500} : {}]}>
                    <View style={[styles.modalHeader, isRTL && styles.modalHeaderRtl]}>
                        <Text
                            style={[styles.modalTitle, isRTL && styles.modalTitleRtl]}>{t('selectMaterial') || 'Select material'}</Text>
                        <PaperIconButton icon={() => <MaterialIcons name="close" size={20} color="#333"
                                                                    style={isRTL ? {transform: [{scaleX: -1}]} : undefined}/>}
                                         onPress={closeMaterialPicker} style={styles.modalClose}/>
                    </View>
                    <PaperTextInput
                        style={styles.modalSearch}
                        mode="outlined"
                        label={t('searchMaterials') || 'Search materials...'}
                        value={modalSearch ?? ''}
                        onChangeText={setModalSearch}
                        autoFocus
                    />
                    <FlatList
                        data={(_materials || []).filter(m => {
                            const s = (modalSearch || '').trim().toLowerCase();
                            if (!s) return true;
                            return (m.name || '').toLowerCase().includes(s) || (m.heName || '').toLowerCase().includes(s);
                        })}
                        keyExtractor={(item) => item._id || item.name}
                        renderItem={({item}) => (
                            <Pressable style={styles.modalItem} onPress={() => handleMaterialSelect(item)}>
                                <Text style={styles.modalItemText}>{item.name}</Text>
                            </Pressable>
                        )}
                    />
                </PaperModal>
            </Portal>
        </View>
      </LinearGradient>
      </Animated.View>
    );
};

// Memoize and forward ref
const Forwarded = forwardRef(TaskInner);
export default React.memo(Forwarded);

const styles = StyleSheet.create({
  taskCardGradient: {
    marginTop: 16,
    borderRadius: 29,
    padding: 4,
    marginHorizontal: 4,
  },
  taskCardInner: {
    borderRadius: 25,
    backgroundColor: '#fff',
    padding: 16,
    position: 'relative',
    // softer shadow for modern elevated card
    shadowColor: '#0f172a',
    shadowOffset: { width: 10, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 8,
      flex: 1,
      minWidth: '100%'
  },
    deleteGradient: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: { backgroundColor: '#f6f8fa', borderWidth: 0, padding: 12, borderRadius: 10, marginTop: 6, color: '#0f172a' },
    nameInput: { fontSize: 18, fontWeight: '700', paddingVertical: 14, backgroundColor: '#fff' },
    smallInput: { paddingVertical: 10, backgroundColor: '#fff' },
    textarea: { height: 100, paddingTop: 10, paddingBottom: 10, textAlignVertical: 'top', backgroundColor: '#fff' },
    inputRtl: { textAlign: 'right' },
    textareaRtl: { textAlign: 'right' },
    clearButton: {
        position: 'absolute',
        top: -14,
        right: -14,
        zIndex: 10,
        shadowColor: '#ff6b6b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10
    },
    clearButtonRtl: { left: -14, right: undefined },
    headerRowSmall: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    addButton: { marginLeft: 8 },
    addButtonGradient: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#4facfe',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6
    },
    collapseButton: { marginRight: 8 },
    collapseButtonRtl: { marginRight: 0, marginLeft: 8 },
    label: { fontSize: 15, fontWeight: '600', marginTop: 12, color: '#0f172a' },
    labelSmall: { fontSize: 13, fontWeight: '600', marginTop: 8, color: '#6b7280' },
    labelRtl: { textAlign: 'right' },
    iconButtonSmall: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#eef2ff'
    },
    materialContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, justifyContent: 'space-between' },
    materialContainerRtl: { flexDirection: 'row-reverse' },
    materialSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 0,
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 12,
        flex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1
    },
    materialSelectorRtl: { flexDirection: 'row-reverse' },
    materialSelectorTextRtl: { textAlign: 'right' },
    materialSelectorText: { flex: 1, color: '#111827' },
    iconButtonRemove: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff'
    },
    iconButtonRemoveRtl: { marginLeft: 0, marginRight: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
    modalContent: {
         backgroundColor: '#fff',
         borderRadius: 12,
         maxHeight: '80%',
         width: '92%',
         padding: 16,
         shadowColor: '#0f172a',
         shadowOffset: { width: 0, height: 12 },
         shadowOpacity: 0.08,
         shadowRadius: 30,
         elevation: 8
     },
    headerRight: { alignItems: 'flex-end', marginLeft: 12, justifyContent: 'space-between' },
    headerDivider: { height: 1, backgroundColor: '#f1f5f9', marginTop: 12, marginBottom: 12, borderRadius: 2 },
    badge: { backgroundColor: '#eef2ff', alignSelf: 'flex-end', marginBottom: 6, paddingHorizontal: 8, height: 28, justifyContent: 'center' },
    badgeText: { color: '#374151', fontWeight: '700', fontSize: 12 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    modalHeaderRtl: { flexDirection: 'row-reverse' },
    modalTitle: { fontSize: 16, fontWeight: '700' },
    modalTitleRtl: { textAlign: 'right' },
    modalClose: { padding: 6 },
    modalSearch: { borderWidth: 0, backgroundColor: '#f6f8fa', padding: 10, borderRadius: 10, marginBottom: 8 },
    modalItem: { paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#f1f1f1' },
    modalItemText: { fontSize: 14, color: '#0f172a' },
    taskContainerInner: { paddingTop: 8, gap: 5 },
    // new layout helpers
    rowSplit: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6, gap: 10 },
    column: { flex: 1 },
    durationInput: {
        backgroundColor: '#fff',
    },

    // Modern startAt time picker card styles
    timePickerCard: {
        marginTop: 0,
        borderRadius: 16,
        backgroundColor: '#f1f5f9',
        borderWidth: 2,
        borderColor: '#e2e8f0',
        overflow: 'hidden',
        shadowColor: '#94a3b8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    timePickerCardActive: {
        backgroundColor: '#667eea',
        borderColor: '#764ba2',
        shadowColor: '#667eea',
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,

    },
    timePickerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        height: 50,
    },
    timeIconWrapper: {
        width: 25,
        height: 25,
        borderRadius: 22,
        backgroundColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',

    },
    timeIconWrapperActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    timeTextWrapper: {
        flex: 1,
    },
    timeLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    timeLabelActive: {
        color: '#e0e7ff',
    },
    timeValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748b',
    },
    timeValueActive: {
        color: '#ffffff',
        fontSize: 22,
    },
    timeClearButton: {
        width: 20,
        height: 20,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
 });
