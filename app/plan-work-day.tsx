import React, {useMemo, useState, useRef, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Modal, Platform, Alert, I18nManager, KeyboardAvoidingView, Keyboard, LayoutAnimation, UIManager} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from './components/header';
import {useUsers} from '@/hooks/use-users';
import {useTaskGroups} from '@/hooks/use-task-groups';
import {useWorkDayPlan} from '@/hooks/use-work-day-plan';
import {useThemeColor} from '@/hooks/use-theme-color';
import Task from '@/components/task-group/task';
import {useTranslation} from '@/app/_i18n';
import {MaterialIcons} from '@expo/vector-icons';
import {useMaterials} from '@/hooks/use-materials';
// NOTE: don't import 'react-native-draggable-flatlist' statically because it
// depends on react-native-reanimated which can throw on web (Value is not a constructor).
// We'll require it at runtime only on native platforms.

export default function PlanWorkDayScreen() {
    const {t} = useTranslation();
    // refs to manage scroll offset restoration when keyboard hides
    const flatListRef = useRef<FlatList<any> | null>(null);
    const prevOffsetRef = useRef<number>(0);
    useEffect(() => {
        const onHide = () => {
            setTimeout(() => {
                try {
                    if (flatListRef.current) {
                        flatListRef.current.scrollToOffset({ offset: prevOffsetRef.current || 0, animated: true });
                    }
                } catch { }
            }, 50);
        };
        const sub = Keyboard.addListener('keyboardDidHide', onHide);
        return () => sub.remove();
    }, []);
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');

    // detect RTL from react-native's I18nManager; for web also respect document.dir
    const isRTL = (() => {
        try {
            if (I18nManager.isRTL) return true;
            if (Platform.OS === 'web' && typeof document !== 'undefined') {
                const dir = document.documentElement.getAttribute('dir');
                return dir === 'rtl';
            }
        } catch {
            // ignore
        }
        return false;
    })();

    // load materials so we can copy full material objects (with names) when
    // copying tasks from a task group into an assignment. If materials are not
    // loaded yet we'll fall back to preserving the id value.
    const {materials} = useMaterials();

    // We use explicit arrow-buttons for reordering across all platforms.
    // No native draggable module is used.

    const {users: allUsers} = useUsers();
    const {taskGroups} = useTaskGroups();

    const [date, setDate] = useState(new Date());
    const [editingDate, setEditingDate] = useState<string>(date.toISOString().slice(0, 10));
    const [showDatePicker, setShowDatePicker] = useState(false);

    const isoDate = useMemo(() => date.toISOString().slice(0, 10), [date]);

    const {plan, save} = useWorkDayPlan(isoDate);

    // Helper to resolve a material reference (string id, object with _id, or
    // object containing a $oid) into the full material object from
    // `materials` when possible. If the reference already looks like a
    // material object (has a `name`) we return it as-is.
    const resolveMaterialRef = React.useCallback((ref: any) => {
        if (!ref) return ref;
        // Already a material-like object
        if (typeof ref === 'object') {
            if (ref.name) return ref;
            // object with _id
            const maybeId = ref._id ?? ref.id ?? (ref.$oid ?? (ref.$id ?? null));
            if (maybeId) {
                return materials?.find((m: any) => String(m._id) === String(maybeId)) ?? ref;
            }
            return ref;
        }
        // If it's a string, try to find it in materials
        if (typeof ref === 'string') {
            return materials?.find((m: any) => String(m._id) === ref || String(m._id) === String(ref)) ?? ref;
        }
        return ref;
    }, [materials]);

    // Helper to extract an id from a material reference (object or string).
    const materialIdFrom = (ref: any) => {
        if (!ref) return ref;
        if (typeof ref === 'object') return ref._id ?? ref.id ?? ref?.$oid ?? ref?.$id ?? undefined;
        return ref; // string id
    };

    // local assignments state to allow editing before saving
    const [assignments, setAssignments] = useState<any[]>(() => {
        if (plan && plan.assignments) return plan.assignments.map((a: any) => ({...a}));
        return [];
    });

    // Brief visual highlight for the task that was just moved. We store the
    // destination index and user id so the UI can flash that row.
    const [movedItem, setMovedItem] = useState<{userId: string, index: number} | null>(null);

    // Enable LayoutAnimation on Android (experimental flag)
    useEffect(() => {
        if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
            try { UIManager.setLayoutAnimationEnabledExperimental(true); } catch { /* ignore */ }
        }
    }, []);

    // Track which assignment (by user id) is currently expanded. Only one may be open at a time.
    const [openAssignmentUser, setOpenAssignmentUser] = useState<string | null>(null);

    const toggleAssignmentOpen = (userId: string) => {
        setOpenAssignmentUser(prev => String(prev) === String(userId) ? null : String(userId));
    };

    // When materials become available, reconcile any already-added assignments
    // (e.g. groups added before materials loaded) so usedMaterials material
    // references are replaced with the resolved material objects where possible.
    React.useEffect(() => {
        if (!materials || materials.length === 0) return;
        setAssignments(prev => prev.map((a: any) => ({
            ...a,
            tasks: (a.tasks || []).map((t: any) => ({
                ...t,
                usedMaterials: (t.usedMaterials || []).map((um: any) => {
                    const resolved = resolveMaterialRef((um as any)?.material);
                    if (resolved) return {...um, material: resolved};
                    // Could not resolve: log for diagnostics so developer can see missing ids
                    try {
                        const orig = (um as any)?.material;
                        const id = typeof orig === 'object' ? (orig._id ?? orig.id ?? orig?.$oid ?? orig?.$id) : orig;
                        if (id) console.warn(`[PlanWorkDay] unresolved material id during reconcile: ${String(id)}`);
                    } catch {
                        // ignore
                    }
                    return um;
                }),
            })),
        })));
    }, [materials, resolveMaterialRef]);

    // keep assignments in sync when plan loads (resolve material ids to
    // material objects when possible so the UI shows material.name instead
    // of raw ids). We depend on `materials` so if materials arrive later we
    // re-run and resolve any id placeholders.
    React.useEffect(() => {
        if (plan && plan.assignments) {
            const mapped = (plan.assignments || []).map((a: any) => ({
                ...a,
                tasks: (a.tasks || []).map((t: any) => ({
                    ...t,
                    usedMaterials: (t.usedMaterials || []).map((um: any) => {
                        const resolved = resolveMaterialRef((um as any)?.material);
                        return resolved ? {...um, material: resolved} : um;
                    }),
                })),
            }));
            setAssignments(mapped);
        } else {
            setAssignments([]);
        }
    }, [plan, materials, resolveMaterialRef]);

    // Helper: calculate total minutes for a given user id from current assignments
    const getTotalMinutesForUser = (userId: string) => {
        const assignment = assignments.find(a => String(a.user._id || a.user) === String(userId));
        if (!assignment || !assignment.tasks) return 0;
        return (assignment.tasks || []).reduce((sum: number, t: any) => {
            const dur = Number(t?.duration || 0);
            return sum + (Number.isFinite(dur) ? dur : 0);
        }, 0);
    };

    // Helper: format minutes as "Xh Ym" (omit zero parts)
    const formatMinutes = (totalMinutes: number) => {
        // normalize input
        const total = Number(totalMinutes) || 0;
        const safeTotal = total < 0 ? 0 : total;
        const hours = Math.floor(safeTotal / 60);
        const minutes = safeTotal % 60;
        const hh = String(hours).padStart(2, '0');
        const mm = String(minutes).padStart(2, '0');
        return `${hh}:${mm}`;
    };

    const toggleUser = (user: any) => {
        const exists = assignments.find(a => String(a.user._id || a.user) === String(user._id));
        if (exists) {
            setAssignments(assignments.filter((a: any) => String(a.user._id || a.user) !== String(user._id)));
        } else {
            setAssignments([...assignments, {user: user._id || user, tasks: []}]);
        }
    };

    const addManualTask = (userId: string) => {
        const empty = {name: '', duration: 30, description: '', usedMaterials: []};
        setAssignments(prev => prev.map(a => {
            if (String(a.user._id || a.user) === String(userId)) {
                return {...a, tasks: [...(a.tasks || []), empty]};
            }
            return a;
        }));
    };

    const addTaskGroupToUser = (userId: string, group: any) => {
        // Copy tasks (including description and usedMaterials) from the selected
        // group into the assignment. When a task in the group references a
        // material by id we resolve it to the full material object from the
        // loaded materials so the UI shows the material name instead of the id.
        const tasksOnly = (group.tasks || []).map((t: any) => ({
            name: t.name,
            duration: t.duration,
            description: t.description,
            usedMaterials: (t.usedMaterials || []).map((um: any) => {
                // Resolve using the shared helper so we handle strings, objects and $oid shapes.
                const resolved = resolveMaterialRef((um as any)?.material);
                return {material: resolved ?? (um as any)?.material, quantity: um.quantity};
            }),
        }));

        setAssignments(prev => prev.map(a => {
            if (String(a.user._id || a.user) === String(userId)) {
                return {...a, tasks: [...(a.tasks || []), ...tasksOnly]};
            }
            return a;
        }));
    };

    const updateTask = (userId: string, taskIndex: number, partial: any) => {
        // If partial is a full task object, replace; otherwise merge
        setAssignments(prev => prev.map((a: any) => {
            if (String(a.user._id || a.user) === String(userId)) {
                const tasks = [...(a.tasks || [])];
                tasks[taskIndex] = {...tasks[taskIndex], ...partial};
                return {...a, tasks};
            }
            return a;
        }));
    };

    const removeTask = (userId: string, taskIndex: number) => {
        setAssignments(assignments.map((a: any) => {
            if (String(a.user._id || a.user) === String(userId)) {
                const tasks = [...(a.tasks || [])];
                tasks.splice(taskIndex, 1);
                return {...a, tasks};
            }
            return a;
        }));
    };

    // Helper to move a task within the tasks array for a user
    const moveTask = (userId: string, from: number, to: number) => {
        if (from === to) return;
        // Use LayoutAnimation for a smooth reorder transition
        try {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        } catch {
            // no-op if LayoutAnimation isn't available for some platform/version
        }

        setAssignments(prev => prev.map((a: any) => {
            if (String(a.user._id || a.user) === String(userId)) {
                const tasks = [...(a.tasks || [])];
                if (from < 0 || from >= tasks.length || to < 0 || to > tasks.length) return a;
                const [moved] = tasks.splice(from, 1);
                tasks.splice(to, 0, moved);
                return {...a, tasks};
            }
            return a;
        }));

        // Flash the moved row at its destination index
        const uid = String(userId);
        setMovedItem({userId: uid, index: to});
        setTimeout(() => setMovedItem(null), 400);
    };

    const handleSave = async () => {
        // ensure date is synced from editing if open
        if (showDatePicker) {
            const parsed = new Date(editingDate);
            if (!Number.isNaN(parsed.getTime())) setDate(parsed);
            setShowDatePicker(false);
        }

        // Convert any resolved material objects back to their ids before saving
        const cleanedAssignments = (assignments || []).map((a: any) => ({
            ...a,
            tasks: (a.tasks || []).map((t: any) => ({
                ...t,
                // Ensure duration is saved as a number (allow editing as string locally)
                duration: (() => {
                    const d = t?.duration;
                    const n = Number(d);
                    return Number.isFinite(n) ? n : 0;
                })(),
                usedMaterials: (t.usedMaterials || []).map((um: any) => ({
                    ...um,
                    material: (() => {
                        const mid = materialIdFrom((um as any)?.material);
                        if (mid !== undefined && mid !== null) return String(mid);
                        // fallback to raw value (could be object) if no id extracted
                        return (um as any)?.material;
                    })(),
                    // Ensure quantity is numeric when saved
                    quantity: (() => {
                        const q = (um as any)?.quantity;
                        const nq = Number(q);
                        return Number.isFinite(nq) ? nq : 0;
                    })(),
                })),
            }))
        }));

        // Debug: print the payload we are about to save so you can inspect
        // whether usedMaterials contain ids (expected) or objects.
        // Remove or guard this in production if it's noisy.
        console.debug('[PlanWorkDay] saving cleanedAssignments:', JSON.parse(JSON.stringify(cleanedAssignments)));

        try {
            await save({date: isoDate, assignments: cleanedAssignments});
            // notify success
            try { Alert.alert(t('success') || 'Success', t('planSaved')); } catch {}
        } catch (e: any) {
            console.error('[PlanWorkDay] save failed', e);
            try { Alert.alert(t('error') || 'Error', String(e?.message || e)); } catch {}
        }
         // optimistic: nothing else for now
    };

    // Filter users to include only employees
    const users = allUsers.filter(u => u.role === 'employee');

    const prevDay = () => {
        const d = new Date(date);
        d.setDate(d.getDate() - 1);
        setDate(d);
        setEditingDate(d.toISOString().slice(0, 10));
    };

    const nextDay = () => {
        const d = new Date(date);
        d.setDate(d.getDate() + 1);
        setDate(d);
        setEditingDate(d.toISOString().slice(0, 10));
    };

    // icon names should follow logical action (prev/next) but flip visually
    // in RTL via container direction. We still choose icon direction so arrows
    // point the way the user expects.
    const prevIconName = isRTL ? 'chevron-right' : 'chevron-right';
    const nextIconName = isRTL ? 'chevron-left' : 'chevron-left';

    // Render header (everything above the assignments list)
    const renderHeader = () => (
        <>
            <Header title={t('planWorkDay') || 'Plan Work Day'} />
            <View style={[styles.dateRow, {flexDirection: 'row'}]}>

                <TouchableOpacity onPress={prevDay} style={styles.arrowBtn}
                                  accessibilityLabel={t('previousDay') || 'Previous day'}>
                    <MaterialIcons name={prevIconName} size={28} color={textColor}/>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateDisplay} onPress={() => {
                    setShowDatePicker(true);
                    setEditingDate(isoDate);
                }}>
                    <Text style={[styles.dateTextCenter, {color: textColor}]}>{isoDate}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={nextDay} style={styles.arrowBtn}
                                  accessibilityLabel={t('nextDay') || 'Next day'}>
                    <MaterialIcons name={nextIconName} size={28} color={textColor}/>
                </TouchableOpacity>

            </View>

            <Modal visible={showDatePicker} transparent animationType="slide"
                   onRequestClose={() => setShowDatePicker(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalInner, {alignSelf: 'stretch'}]}>
                        <Text style={[styles.label, {textAlign: isRTL ? 'right' : 'left'}]}>{t('selectDate') || 'Select date'}</Text>
                        <TextInput value={editingDate} onChangeText={setEditingDate} style={[styles.input, {textAlign: isRTL ? 'right' : 'left'}]}
                                   placeholder="YYYY-MM-DD"/>
                        <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8}}>
                            <TouchableOpacity style={[styles.smallBtn, {marginRight: 8}]} onPress={() => {
                                const parsed = new Date(editingDate);
                                if (!Number.isNaN(parsed.getTime())) {
                                    setDate(parsed);
                                    setShowDatePicker(false);
                                }
                            }}>
                                <Text style={{color: 'white'}}>{t('set') || 'Set'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.smallBtn, {backgroundColor: '#777'}]}
                                              onPress={() => setShowDatePicker(false)}>
                                <Text style={{color: 'white'}}>{t('cancel') || 'Cancel'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Text style={[styles.sectionTitle, {color: textColor, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr'}]}>{t('employees') || 'Employees'}</Text>
            {/* Employees shown as toggle-pill buttons so admin can quickly select/deselect employees */}
            <View style={[styles.togglesContainer, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}>
                {users.map((u: any) => {
                    const selected = assignments.find(a => String(a.user._id || a.user) === String(u._id));
                    return (
                        <TouchableOpacity
                            key={u._id}
                            onPress={() => toggleUser(u)}
                            style={[
                                styles.userToggle,
                                selected ? styles.userToggleSelected : styles.userToggleUnselected,
                            ]}
                        >
                            {/* Show name and total formatted time */}
                            <Text
                                style={[styles.userToggleText, selected && styles.userToggleTextSelected, {textAlign: isRTL ? 'right' : 'left'}]}>{(u.name || u.idNumber || u._id)}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <Text style={[styles.sectionTitle, {color: textColor, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr'}]}>{t('assignments') || 'Assignments'}</Text>
        </>
    );

    // Render each assignment (used by FlatList)
    const renderAssignment = ({item: a, index: idx}: {item: any, index: number}) => {
        const userId = String(a.user._id || a.user);
        const isOpen = openAssignmentUser === userId;
        const userObj = users.find(u => String(u._id) === String(a.user._id || a.user)) || {name: ('User ' + (idx + 1))};
        return (
            <View key={userId}
                  style={[styles.assignmentCard, {backgroundColor: '#fafafa'}]}>
                {/* Header: show user name with their total assigned time and a chevron to collapse/expand */}
                <TouchableOpacity onPress={() => toggleAssignmentOpen(userId)}
                                  style={{flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                    <Text
                        style={{fontWeight: '600', textAlign: isRTL ? 'right' : 'left'}}>{userObj.name + ' (' + formatMinutes(getTotalMinutesForUser(a.user._id || a.user)) + ')'}</Text>
                    <MaterialIcons name={isOpen ? 'expand-less' : 'expand-more'} size={24} color="#666" />
                </TouchableOpacity>

                {/* Only render the assignment details (tasks, buttons) when this assignment is open */}
                {isOpen && (
                    <View style={{marginTop: 8}}>
                        <View style={{flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 8}}>
                            <TouchableOpacity style={styles.smallBtn}
                                              onPress={() => addManualTask(a.user._id || a.user)}>
                                <Text style={{color: 'white'}}>{t('addTask') || 'Add Task'}</Text>
                            </TouchableOpacity>
                            <View style={{width: 8}}/>
                            <View style={{flex: 1}}>
                                <FlatList
                                    horizontal
                                    data={taskGroups || []}
                                    keyExtractor={(g: any) => String(g._id)}
                                    renderItem={({item: g}: {item: any}) => (
                                        <TouchableOpacity style={styles.groupBtn}
                                                          onPress={() => addTaskGroupToUser(a.user._id || a.user, g)}>
                                            <Text style={{color: 'white'}}>{g.name}</Text>
                                        </TouchableOpacity>
                                    )}
                                    showsHorizontalScrollIndicator={false}
                                />
                            </View>
                        </View>

                        {/* Render tasks with Up/Down arrow buttons for reordering on all platforms */}
                        {(a.tasks || []).map((task: any, ti: number) => (
                            // If this task was just moved, briefly highlight it
                            <View key={ti} style={[{flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center'},
                                movedItem && movedItem.userId === String(a.user._id || a.user) && movedItem.index === ti ? {backgroundColor: '#e6f7ff', borderRadius: 6, paddingVertical: 4} : {}
                            ]}>
                                <View style={{width: 40, alignItems: 'center'}}>
                                    <TouchableOpacity
                                        accessibilityLabel={t('moveUp') || 'Move task up'}
                                        disabled={ti === 0}
                                        onPress={() => moveTask(a.user._id || a.user, ti, ti - 1)}
                                        style={[styles.arrowControlBtn, {opacity: ti === 0 ? 0.4 : 1}]}
                                    >
                                        <Text style={{color: 'white', fontSize: 16}}>↑</Text>
                                    </TouchableOpacity>
                                    <View style={{height: 6}}/>
                                    <TouchableOpacity
                                        accessibilityLabel={t('moveDown') || 'Move task down'}
                                        disabled={ti === (a.tasks || []).length - 1}
                                        onPress={() => moveTask(a.user._id || a.user, ti, ti + 1)}
                                        style={[styles.arrowControlBtn, {opacity: ti === (a.tasks || []).length - 1 ? 0.4 : 1}]}
                                    >
                                        <Text style={{color: 'white', fontSize: 16}}>↓</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={{flex: 1}} pointerEvents="box-none">
                                    <Task
                                        task={task}
                                        onChange={(newTask) => updateTask(a.user._id || a.user, ti, newTask)}
                                        onRemove={() => removeTask(a.user._id || a.user, ti)}
                                        index={ti}
                                    />
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={{flex: 1}}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
        >
            <SafeAreaView style={{flex: 1}} edges={['bottom']}>
                <FlatList
                 ref={(r) => { flatListRef.current = r; }}
                 onScroll={(e) => { prevOffsetRef.current = e.nativeEvent.contentOffset.y; }}
                 scrollEventThrottle={16}
                  data={assignments}
                  keyExtractor={(item) => String(item.user._id || item.user)}
                  ListHeaderComponent={renderHeader}
                 ListEmptyComponent={() => (
                    <Text style={{color: textColor, paddingHorizontal: 16}}>{t('noEmployeesSelected') || 'No employees selected'}</Text>
                )}
                 renderItem={renderAssignment}
                 // FlatList should fill the available space, contentContainer should size to content
                 style={[styles.fullHeight, {backgroundColor}]}
                 // writingDirection is not present on some React Native TypeScript defs; cast the inline style to `any`
                 contentContainerStyle={[styles.container, ({ writingDirection: isRTL ? 'rtl' : 'ltr' } as any)]}
                 keyboardShouldPersistTaps={'handled'}
                 keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                 nestedScrollEnabled={true}
                 ListFooterComponent={() => (
                     <>
                        <View style={{height: 8}}/>
                        <TouchableOpacity style={[styles.saveBtn, {backgroundColor: '#2196F3'}]} onPress={handleSave}>
                            <Text style={{color: 'white', fontWeight: '600'}}>{t('savePlan') || 'Save Plan'}</Text>
                        </TouchableOpacity>
                     </>
                 )}
                />
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    // content container (no flex) so FlatList can scroll when content is smaller
    container: {
        padding: 16,
        paddingBottom: 16,
    },
    // fullHeight used on FlatList to occupy available space
    fullHeight: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    dateRow: {
        alignItems: 'center',
        marginBottom: 16,
    },
    label: {
        fontSize: 16,
        marginRight: 8,
    },
    dateButton: {
        backgroundColor: '#2196F3',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 4,
    },
    smallBtn: {
        backgroundColor: '#2196F3',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
    },
    // Larger touch target for arrow reordering (up/down) buttons
    arrowControlBtn: {
        backgroundColor: '#2196F3',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    togglesContainer: {
        flexWrap: 'wrap',
        marginBottom: 16,
    },
    userToggle: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 8,
    },
    userToggleSelected: {
        backgroundColor: '#2196F3',
    },
    userToggleUnselected: {
        backgroundColor: '#ddd',
    },
    userToggleText: {
        fontSize: 14,
    },
    userToggleTextSelected: {
        color: 'white',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    assignmentCard: {
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
        elevation: 1,
    },
    datePicker: {
        width: '100%',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 16,
    },
    dateInput: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fafafa',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    dateText: {
        fontSize: 16,
    },
    taskRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    taskInput: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#fafafa',
        borderRadius: 4,
        marginRight: 8,
    },
    groupBtn: {
        backgroundColor: '#673AB7',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 4,
        marginRight: 8,
    },
    removeBtn: {
        backgroundColor: '#F44336',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 4,
    },
    saveBtn: {
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 4,
        alignItems: 'center',
    },
    arrowBtn: {
        padding: 8,
        borderRadius: 4,
        marginHorizontal: 8,
    },
    dateDisplay: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fafafa',
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateTextCenter: {
        fontSize: 16,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalInner: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        elevation: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 8,
        borderRadius: 6,
        backgroundColor: '#fafafa',
    },
});
