import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import {View, TouchableOpacity, StyleSheet, Platform, KeyboardAvoidingView, Keyboard} from 'react-native';
import {ITaskGroup, ITask, IUsedMaterial} from '@/types/task-group';
import {useTranslation} from '@/app/_i18n';
import {MaterialIcons} from '@expo/vector-icons';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import DraggableFlatList, {RenderItemParams} from 'react-native-draggable-flatlist';
import Task from './task';
import {useMaterials} from '@/hooks/use-materials';
import {TextInput} from "react-native-paper";
import {LinearGradient} from 'expo-linear-gradient';

interface TaskGroupFormProps {
    initialData?: ITaskGroup;
    onSubmit: (data: Partial<ITaskGroup>) => void;
}

const TaskGroupForm = ({initialData, onSubmit}: TaskGroupFormProps) => {
    const {t} = useTranslation();
    const isRTL = true;
    const nextIdRef = useRef<number>(0);
    const makeKey = useCallback(() => `task-${Date.now()}-${(nextIdRef.current++).toString(36)}`, []);
    const [name, setName] = useState(initialData?.name || '');
    // ensure stable keys for DraggableFlatList; add _key where missing
    const [tasks, setTasks] = useState<Partial<ITask & { _key?: string }>[]>(() =>
        (initialData?.tasks || []).map((t: any) => ({...t, _key: t._key ?? t._id ?? makeKey()})),
    );
    const listRef = useRef<any>(null);
    const {materials} = useMaterials();
    // refs for child Task components so we can flush their local state before submit (Android blurs may not fire)
    const taskRefs = useRef<Record<string, any>>({});
    const autoSaveTimerRef = useRef<any>(null);
    // Track the last synced ID to only sync when switching task groups
    const lastSyncedIdRef = useRef<string | undefined>(initialData?._id);
    // Store latest task data in ref to avoid re-renders on field changes
    const tasksDataRef = useRef<Partial<ITask & { _key?: string }>[]>(tasks);
    // Timer for committing submit after blur/focus-out
    const commitTimerRef = useRef<any>(null);
    // Guard to avoid re-entrant submit when flushing refs
    const isFlushingRef = useRef<boolean>(false);

    const handleAutoSave = useCallback(async () => {
        if (!name.trim()) return;

        // Flush all task refs to get latest data
        isFlushingRef.current = true;
        const flushedTasks = tasksDataRef.current.map((task) => {
            const key = (task as any)._key ?? (task as any)._id;
            const r = key ? taskRefs.current[key] : null;
            try {
                if (r && typeof r.flush === 'function') {
                    return r.flush();
                }
            } catch {
            }
            return task;
        });
        isFlushingRef.current = false;

        const finalTasks = flushedTasks.map((task: any) => ({
            _id: task._id,
            name: task.name ?? '',
            duration: task.duration ?? 0,
            description: task.description ?? '',
            startAt: task.startAt ?? undefined,
            usedMaterials: (task.usedMaterials || []).map((um: any) => ({
                material: (um as any)?.material?._id ?? (um as any)?.material,
                quantity: (um as any)?.quantity ?? 0,
            })) as IUsedMaterial[],
            producedMaterials: (task.producedMaterials || []).map((pm: any) => ({
                material: (pm as any)?.material?._id ?? (pm as any)?.material,
                quantity: (pm as any)?.quantity ?? 0,
            })) as IUsedMaterial[],
        }));

        const taskGroupData: Partial<ITaskGroup> = {name, tasks: finalTasks as any};
        await onSubmit(taskGroupData);

        // Don't navigate - just save and keep editing
    }, [name, onSubmit]);

    // Debounced submit used on blur/focus-out commits
    const scheduleSubmit = useCallback(() => {
        if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
        commitTimerRef.current = setTimeout(() => {
            handleAutoSave();
        }, 300);
    }, [handleAutoSave]);


    useEffect(() => {
        // ONLY sync when the task group ID changes (switching to a different group)
        // Never sync on same-ID updates to prevent refresh after our own saves
        if (initialData && initialData._id !== lastSyncedIdRef.current) {
            lastSyncedIdRef.current = initialData._id;
            setName(initialData.name);
            const newTasks = (initialData.tasks || []).map((t: any) => ({...t, _key: t._key ?? t._id ?? makeKey()}));
            setTasks(newTasks);
            tasksDataRef.current = newTasks;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData?._id, makeKey]);

    const handleTaskChange = useCallback((index: number, newTask: Partial<ITask>) => {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
            try {
                console.log('[TaskGroupForm] handleTaskChange', {index, newTask});
            } catch {
            }
        }

        // Update the ref directly without triggering state update to preserve focus
        const key = (newTask as any)?._key ?? (newTask as any)?._id;

        if (index !== undefined && index !== null && index >= 0 && index < tasksDataRef.current.length) {
            // Update by index
            tasksDataRef.current[index] = {...tasksDataRef.current[index], ...newTask} as any;
        } else if (key) {
            // Find by key
            const found = tasksDataRef.current.findIndex(t => (t as any)?._key === key || (t as any)?._id === key);
            if (found >= 0) {
                tasksDataRef.current[found] = {...tasksDataRef.current[found], ...newTask} as any;
            }
        }

        // If this update is a commit (came from onBlur/focus-out), schedule submit
        if ((newTask as any)?.__commit && !isFlushingRef.current) {
            scheduleSubmit();
        }
        // Don't call setTasks to avoid re-rendering the list
        // The data is stored in the ref and will be used during auto-save
    }, [scheduleSubmit]);

    const addTask = () => {
        const newTask = {
            _key: makeKey(),
            name: '',
            duration: 0,
            description: '',
            startAt: '',
            usedMaterials: [],
            producedMaterials: []
        } as any;
        setTasks(prev => {
            const updated = [...prev, newTask];
            tasksDataRef.current = updated;
            return updated;
        });
    };

    const removeTaskByKey = (key: string) => {
        setTasks(prev => {
            const updated = prev.filter(t => (t as any)._key !== key);
            tasksDataRef.current = updated;
            return updated;
        });
        // remove any stored ref for removed key
        if (taskRefs.current[key]) delete taskRefs.current[key];
        handleAutoSave().then();
    };

    const memoTasks = useMemo(() => tasks, [tasks]);

    const renderListFooter = () => (
        <View>
            {/* If there are existing tasks, show the Add button after the list */}
            {tasks.length > 0 && (
                <View style={{marginTop: 12}}>

                </View>
            )}
            {/* reduced spacer since no footer buttons */}
            <View style={{height: 20}}/>
        </View>
    );

    // Small inner component for a task row to manage local press timer for starting drag
    function TaskRow({task, taskIndex, drag, isActive}: {
        task: any;
        taskIndex: number;
        drag: () => void;
        isActive: boolean
    }) {
        const pressTimer = useRef<any>(null);
        const handlePressIn = () => {
            // start timer to begin drag after 600ms
            pressTimer.current = setTimeout(() => {
                try {
                    drag();
                } catch {
                }
                pressTimer.current = null;
            }, 600);
        };
        const handlePressOut = () => {
            if (pressTimer.current) {
                clearTimeout(pressTimer.current);
                pressTimer.current = null;
            }
        };

        return (
            <View style={[styles.draggableTaskContainer, isActive && styles.draggableTaskActive]}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <TouchableOpacity
                        style={[styles.dragHandle]}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                        // hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
                        accessibilityLabel={t('dragToReorder') || 'Drag to reorder'}
                    >
                        <MaterialIcons name="unfold-more" size={24} color="#999"/>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            const key = (task as any)?._key ?? (task as any)?._id;
                            if (key) removeTaskByKey(key);
                        }}
                        accessibilityLabel={t('deleteTask') || 'Delete Task'}
                        style={{padding: 8}}
                    >
                        <MaterialIcons name="delete" size={20} color="#ec4899"/>
                    </TouchableOpacity>
                </View>
                <View style={styles.taskContent}>
                    <Task
                        ref={(el: any) => {
                            const key = (task as any)?._key ?? (task as any)?._id;
                            if (!key) return;
                            if (el) taskRefs.current[key] = el;
                            else delete taskRefs.current[key];
                        }}
                        task={task}
                        onChange={(newTask) => handleTaskChange(taskIndex, newTask)}
                        index={taskIndex}
                        materials={materials}
                    />
                </View>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{flex: 1}}>
            <LinearGradient colors={["#f3fafc", "#f8fafc", "#c3e6fa", "#e2eeef"]} style={{flex: 1}}>
                <KeyboardAvoidingView
                    style={styles.container}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
                >
                    {/* Move group name input outside the FlatList so it won't unmount on list re-renders */}
                    <View style={styles.groupNameContainer}>
                        <TouchableOpacity style={styles.iconButton} onPress={addTask}
                                          accessibilityLabel={t('addTask') || 'Add Task'}>
                            <MaterialIcons name="add" size={24} color="#007AFF"
                                           style={isRTL ? {transform: [{scaleX: -1}]} : undefined}/>
                        </TouchableOpacity>
                        <TextInput
                            mode={'outlined'}
                            style={[{flex: 1}, isRTL && styles.inputRtl]}
                            value={name}
                            label={t('groupName') || 'Group Name'}
                            onChangeText={setName}
                            onBlur={scheduleSubmit}
                            placeholder={t('groupName') || 'Group Name'}
                            // keep keyboard focus even when list updates
                            keyboardType="default"
                            returnKeyType="done"
                            left={<TextInput.Icon icon="folder-open" color="#f97316"/>}
                            outlineColor="#ec4899"
                            activeOutlineColor="#f97316"
                        />
                    </View>
                    {/*{renderListHeader()}*/}
                    <DraggableFlatList
                        ref={listRef}
                        data={memoTasks}
                        // enable smooth nested scrolling while dragging
                        nestedScrollEnabled
                        activationDistance={20}
                        dragItemOverflow
                        onDragBegin={() => {
                            Keyboard.dismiss(); /* optional debug */
                        }}
                        onDragEnd={({data}) => {
                            setTasks(data);
                            tasksDataRef.current = data;
                            scheduleSubmit();
                            Keyboard.dismiss();
                        }}
                        onRelease={() => {
                            Keyboard.dismiss();
                        }}
                        keyExtractor={(item: any, index) => (item?._key ?? item?._id ?? `task-${index}`)}
                        // ListFooterComponent={renderListFooter}
                        contentContainerStyle={styles.scrollContainer}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({item: task, index: taskIndex, drag, isActive}: RenderItemParams<any>) => (
                            <TaskRow task={task} taskIndex={taskIndex} drag={drag} isActive={isActive}/>
                        )}
                    />
                </KeyboardAvoidingView>
            </LinearGradient>
        </GestureHandlerRootView>
    );
};

// Memoize the component to prevent re-renders when parent updates
// Only re-render if the task group ID actually changes
export default React.memo(TaskGroupForm, (prevProps, nextProps) => {
    // Return true if props are equal (prevents re-render)
    // Return false if props are different (allows re-render)

    // Only re-render if we're switching to a different task group
    const prevId = prevProps.initialData?._id;
    const nextId = nextProps.initialData?._id;

    // If IDs are the same, don't re-render (return true)
    // If IDs are different, allow re-render (return false)
    return prevId === nextId;
});

const styles = StyleSheet.create({
    container: {flex: 1, padding: 16, marginBottom: 120},
    // ensure ScrollView content container exists so content can be padded/centered
    scrollContainer: {flexGrow: 1, paddingBottom: 20},
    label: {fontSize: 16, fontWeight: '600', marginTop: 12, color: '#1e293b'},
    labelRtl: {textAlign: 'right'},
    input: {borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 4, marginTop: 6},
    inputRtl: {textAlign: 'right'},
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#e0f2fe'
    },
    addButtonFull: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    draggableTaskContainer: {flexDirection: 'column', alignItems: 'flex-start', marginTop: 20,},
    draggableTaskActive: {opacity: 0.8, transform: [{scale: 1.02}]},
    dragHandle: {width: 40, alignItems: 'center', justifyContent: 'flex-start'},
    dragHandleRtl: {paddingRight: 0, paddingLeft: 8},
    taskContent: {flex: 1},
    iconButtonSmall: {width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center'},
    iconButtonRemove: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8
    },
    iconButtonRemoveRtl: {marginLeft: 0, marginRight: 8},
    headerRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    headerRowRtl: {flexDirection: 'row-reverse'},
    headerRowSmall: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8},
    headerLeft: {flexDirection: 'row', alignItems: 'center'},
    collapseButton: {marginRight: 8},
    collapseButtonRtl: {marginRight: 0, marginLeft: 8},
    // taskCard: visible bordered box with cross-platform shadow
    taskCard: {
        marginTop: 12,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        padding: 12,
        position: 'relative',
        // border
        borderWidth: 1,
        borderColor: '#e2e8f0',
        // iOS shadow
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.15,
        shadowRadius: 8,
        // Android elevation
        elevation: 6,
    },
    taskContainerInner: {paddingTop: 8},
    clearButton: {
        position: 'absolute',
        top: -10,
        left: -10,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fee2e2'
    },
    clearButtonRtl: {left: undefined, right: -10},
    clearButtonText: {fontSize: 16, color: '#dc2626'},
    materialContainer: {flexDirection: 'row', alignItems: 'center', marginTop: 8, justifyContent: 'space-between'},
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 8,
        marginBottom: 8,
        width: '100%'
    },
    footer: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 16,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        // iOS shadow
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 6},
        shadowOpacity: 0.2,
        shadowRadius: 12,
        // Android elevation
        elevation: 8,
        zIndex: 50,
    },
    footerRtl: {flexDirection: 'row-reverse'},
    buttonContainerRtl: {flexDirection: 'row-reverse'},
    materialSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        padding: 8,
        borderRadius: 8,
        width: '40%',
        backgroundColor: '#f8fafc'
    },
    materialSelectorText: {flex: 1, color: '#334155'},
    modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'},
    modalContent: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        maxHeight: '80%',
        width: '90%',
        padding: 16,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10
    },
    modalHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12},
    modalHeaderRtl: {flexDirection: 'row-reverse'},
    modalTitle: {fontSize: 18, fontWeight: '700', color: '#1e293b'},
    modalClose: {padding: 6},
    modalSearch: {
        borderWidth: 1,
        borderColor: '#cbd5e1',
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
        backgroundColor: '#f8fafc'
    },
    modalItem: {paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0'},
    modalItemText: {fontSize: 15, color: '#334155'},
    footerBtn: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 6,
        backgroundColor: '#10b981', // Green for submit
        shadowColor: '#10b981',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    footerBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    buttonDisabled: {
        backgroundColor: '#94a3b8',
        shadowOpacity: 0,
        elevation: 0,
    },
    groupNameContainer: {
        borderRadius: 16,
        backgroundColor: '#ffffff',
        padding: 16,
        // iOS shadow
        shadowColor: '#6366f1',
        shadowOffset: {width: 0, height: 6},
        shadowOpacity: 0.15,
        shadowRadius: 12,
        // Android elevation
        elevation: 8,
        borderWidth: 1,
        borderColor: '#e0e7ff',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
});
