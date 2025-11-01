import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Modal, FlatList, Keyboard, ActivityIndicator } from 'react-native';
import { useTranslation } from '@/app/_i18n';
import { MaterialIcons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import Task from '@/components/task-group/task';

interface EmployeeTasksFormProps {
  initialTasks?: any[];
  onSubmit: (tasks: any[]) => void;
  onClose: () => void;
  isSaving?: boolean;
  employeeName?: string;
  // Optional task groups to allow copying a group into this employee's tasks
  taskGroups?: any[];
  // Optional ISO date (YYYY-MM-DD) to display on the screen
  date?: string;
}

export default function EmployeeTasksForm({ initialTasks = [], onSubmit, onClose, isSaving = false, employeeName, taskGroups = [], date }: EmployeeTasksFormProps) {
  const { t } = useTranslation();
  const isRTL = true;
  const nextIdRef = useRef<number>(0);
  const makeKey = () => `task-${Date.now()}-${(nextIdRef.current++).toString(36)}`;

  // Format a provided ISO date (YYYY-MM-DD) into a locale-friendly string.
  const formatDisplayDate = (iso?: string) => {
    try {
      if (!iso) return '';
      // Create a date at local midnight to avoid timezone shifts when parsing
      const d = new Date(iso + 'T00:00:00');
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' });
    } catch {
      return iso || '';
    }
  };

  const displayDate = formatDisplayDate(date);

  // ensure tasks have stable keys for DraggableFlatList
  const [tasks, setTasks] = useState<any[]>(() => (initialTasks || []).map((it: any) => ({ ...it, _key: it._key ?? it._id ?? makeKey() })));
  const [showGroupsModal, setShowGroupsModal] = useState(false);

  useEffect(() => {
    setTasks((initialTasks || []).map((it: any) => ({ ...it, _key: it._key ?? it._id ?? makeKey() })));
  }, [initialTasks]);

  const addTaskGroup = (group: any) => {
    if (!group || !group.tasks) return;
    const tasksOnly = (group.tasks || []).map((t: any) => ({
      ...t,
      _key: t._key ?? t._id ?? makeKey(),
      name: t.name || '',
      duration: t.duration ?? 0,
      description: t.description ?? '',
      usedMaterials: t.usedMaterials ?? [],
      producedMaterials: t.producedMaterials ?? [],
    }));
    setTasks(prev => {
      const newArr = [...prev, ...tasksOnly];
      // Allow the list to render, then scroll to the end so newly added tasks are visible
      setTimeout(() => {
        try {
          if (listRef.current?.scrollToEnd) {
            listRef.current.scrollToEnd({ animated: true });
          } else if (listRef.current?.scrollToOffset) {
            // Fallback: large offset to ensure end is visible
            listRef.current.scrollToOffset({ offset: 99999, animated: true });
          }
        } catch { /* ignore */ }
      }, 50);
      return newArr;
    });
  };

  const handleTaskChange = useCallback((index: number, newTask: any) => {
    setTasks(prev => {
      const copy = [...prev];
      // If newTask has a stable key, find the correct index by key to avoid index staleness after reorder
      let idx = index;
      try {
        const key = newTask?._key ?? newTask?._id;
        if (key) {
          const found = copy.findIndex((t: any) => (t?._key ?? t?._id) === key);
          if (found >= 0) idx = found;
        }
      } catch {}
      copy[idx] = { ...copy[idx], ...newTask };
      return copy;
    });
  }, [setTasks]);

  const addTask = () => {
    const newTask = { _key: makeKey(), name: '', duration: 0, description: '', usedMaterials: [], producedMaterials: [] };
    setTasks(prev => {
      const newArr = [...prev, newTask];
      // Scroll to the end after adding the task so the new task is visible
      setTimeout(() => {
        try {
          if (listRef.current?.scrollToEnd) {
            listRef.current.scrollToEnd({ animated: true });
          } else if (listRef.current?.scrollToOffset) {
            listRef.current.scrollToOffset({ offset: 99999, animated: true });
          }
        } catch { /* ignore */ }
      }, 50);
      return newArr;
    });
  };

  // Preferred removal by stable key to avoid index staleness or touch/overlap issues
  const removeTaskByKey = (key: string) => {
    setTasks(prev => prev.filter(t => t._key !== key));
  };

  const handleSubmit = () => {
    onSubmit(tasks);
  };

  const listRef = useRef<any>(null);

  // Derive visible tasks for display: hide tasks that have been started (have startTime)
  const visibleTasks = useMemo(() => {
    return (tasks || []).filter((t: any) => !t?.startTime);
  }, [tasks]);

  // Compute which tasks should be locked (cannot be edited or removed or dragged)
  // Criteria: task has been started (startTime) or ended (endTime) OR the task's position changed compared to initial order
  const orderChangedKeys = useMemo(() => {
    const initialKeys = (initialTasks || []).map((t: any) => t._key ?? t._id);
    const currentKeys = (tasks || []).map((t: any) => t._key ?? t._id);
    const changed = new Set<string>();
    currentKeys.forEach((key, index) => {
      if (key !== initialKeys[index]) {
        changed.add(key);
      }
    });
    return Array.from(changed);
  }, [initialTasks, tasks]);

  // Locking logic: determine if a task is locked based on its key
  const isTaskLocked = useCallback((key?: string) => {
    if (!key) return false;
    // Check if the task is in the list of changed order keys (meaning its position has changed)
    if (orderChangedKeys.includes(key)) return true;
    // Find the task by key to check its startTime and endTime
    const task = tasks.find((t: any) => (t._key ?? t._id) === key);
    // A task is locked if it has a startTime or endTime (meaning it has been started or completed)
    return !!task?.startTime || !!task?.endTime;
  }, [orderChangedKeys, tasks]);

  // Small inner component for a task row to manage local press timer for starting drag
  function TaskRow({ task, taskIndex, drag, isActive }: { task: any; taskIndex: number; drag: () => void; isActive: boolean }) {
    const pressTimer = useRef<any>(null);
    const handlePressIn = () => {
      // start timer to begin drag after 600ms
      pressTimer.current = setTimeout(() => {
        try { drag(); } catch (e) { /* ignore */ }
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
        <TouchableOpacity
          style={[styles.dragHandle, isRTL && styles.dragHandleRtl]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel={t('dragToReorder') || 'Drag to reorder'}
        >
          <MaterialIcons name="drag-indicator" size={24} color="#999" />
        </TouchableOpacity>
        <View style={styles.taskContent}>
          <Task
            task={task}
            onChange={(newTask) => handleTaskChange(taskIndex, newTask)}
            // Use key-based removal to ensure the correct task is removed
            onRemove={() => removeTaskByKey(task._key)}
            index={taskIndex}
          />
        </View>
      </View>
    );
  }

  const renderListFooter = () => (
    <View>
      {/* Keep spacing at the end of the list */}
      <View style={{ height: 120 }} />
    </View>
  );

  // Modal to choose a task group to add
  const renderGroupsModal = () => (
    <Modal visible={showGroupsModal} transparent animationType="slide" onRequestClose={() => setShowGroupsModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalInner, { maxHeight: '70%' }]}>
          <Text style={[styles.label, { marginBottom: 8 }]}>{t('taskGroups') || 'Task Groups'}</Text>
          <FlatList
            data={taskGroups}
            keyExtractor={(g: any) => String(g._id ?? g.id ?? g.name)}
            renderItem={({ item: g }) => (
              <TouchableOpacity style={[styles.groupBtn, { marginBottom: 8 }]} onPress={() => { addTaskGroup(g); setShowGroupsModal(false); }}>
                <Text style={{ color: 'white' }}>{g.name}</Text>
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={true}
          />
          <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'flex-end' }}>
            <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#777' }]} onPress={() => setShowGroupsModal(false)}>
              <Text style={{ color: 'white' }}>{t('cancel') || 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        {/* Header showing employee name and fixed action buttons (Add Group / Add Task) */}
        <View style={[styles.headerRow, { marginBottom: 8 }, isRTL && styles.headerRowRtl]}>
          <View style={{ flexDirection: 'column' }}>
            <Text style={[styles.label, isRTL && styles.labelRtl]}>{employeeName || (t('employeeTasks') || 'Employee Tasks')}</Text>
            {displayDate ? <Text style={styles.dateText}>{displayDate}</Text> : null}
          </View>
          <View style={[styles.headerActions, isRTL && styles.headerActionsRtl]}>
            {taskGroups && taskGroups.length > 0 && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setShowGroupsModal(true)}
                accessibilityLabel={t('addTaskGroup') || 'Add Task Group'}
                activeOpacity={0.75}
              >
                <MaterialIcons name="playlist-add" size={22} color="#007AFF" style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={addTask}
              accessibilityLabel={t('addTask') || 'Add Task'}
              activeOpacity={0.75}
            >
              <MaterialIcons name="add" size={28} color="#007AFF" style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Top action buttons (Submit / Cancel) moved from footer */}
        <View style={[styles.topButtonsContainer, isRTL && styles.topButtonsContainerRtl]}>
          <View style={[styles.buttonContainer, isRTL && styles.buttonContainerRtl]}>
            {/* show a spinner beside the button only while saving; position respects RTL */}
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
              {isSaving && (
                <ActivityIndicator
                  size="small"
                  color={isRTL ? '#007AFF' : '#007AFF'}
                  style={isRTL ? { marginLeft: 8 } : { marginRight: 8 }}
                />
              )}

              <TouchableOpacity
                style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isSaving}
                accessibilityLabel={isSaving ? (t('saving') || 'Saving...') : (t('submit') || 'Submit')}
              >
                <MaterialIcons name="save" size={18} color="#fff" />
                <View style={{ width: 8 }} />
                <Text style={styles.primaryButtonText}>{isSaving ? (t('saving') || 'Saving...') : (t('submit') || 'Submit')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.secondaryButton]}
              onPress={onClose}
              accessibilityLabel={t('cancel') || 'Cancel'}
            >
              <MaterialIcons name="close" size={18} color="#d9534f" />
              <View style={{ width: 8 }} />
              <Text style={styles.secondaryButtonText}>{t('cancel') || 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <DraggableFlatList
           ref={listRef}
           data={visibleTasks}
           extraData={tasks}
           onDragBegin={(_index: number) => { Keyboard.dismiss(); }}
           onDragEnd={(params: any) => { handleDragEnd(params); }}
           onRelease={(_index: number) => { Keyboard.dismiss(); }}
           onScroll={() => { /* optional debug placeholder */ }}
          keyExtractor={(item: any) => item._key}
          ListFooterComponent={renderListFooter}
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          activationDistance={20}
          dragItemOverflow
          renderItem={({ item: task, index: taskIndex, drag, isActive }: RenderItemParams<any>) => (
            // Provide a stable key so React preserves the Task component instance across re-renders
            <TaskRow key={task._key ?? task._id ?? `task-${taskIndex}`} task={task} taskIndex={taskIndex} drag={drag} isActive={isActive} />
           )}
         />

        {renderGroupsModal()}
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, },
  scrollContainer: { flexGrow: 1, paddingBottom: 140 },
  dateText: { fontSize: 14, color: '#666', marginTop: 4 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  labelRtl: { textAlign: 'right' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerRowRtl: { flexDirection: 'row-reverse' },
  headerActionsRtl: { flexDirection: 'row-reverse' },
  iconBtn: { paddingHorizontal: 8, paddingVertical: 6, marginLeft: 8, marginRight: 8 },
  addButtonFull: { width: '100%', borderWidth: 1, borderColor: '#e6e6e6', borderRadius: 8, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  draggableTaskContainer: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 },
  draggableTaskActive: { opacity: 0.8, transform: [{ scale: 1.02 }] },
  dragHandle: { width: 40, paddingTop: 16, paddingRight: 8, alignItems: 'center', justifyContent: 'flex-start' },
  dragHandleRtl: { paddingRight: 0, paddingLeft: 8 },
  taskContent: { flex: 1 },
  topButtonsContainer: { marginBottom: 8 },
  topButtonsContainerRtl: { flexDirection: 'row-reverse' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 12, paddingBottom: 32, },
  footerRtl: { flexDirection: 'row-reverse' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  buttonContainerRtl: { flexDirection: 'row-reverse' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalInner: { width: '90%', backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 4 },
  groupBtn: { backgroundColor: '#007AFF', borderRadius: 8, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  smallBtn: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  labelSmall: { fontSize: 14, fontWeight: '500' },
  separator: { height: 1, backgroundColor: '#e6e6e6', marginVertical: 8 },
  taskName: { fontSize: 16, fontWeight: '500' },
  taskDescription: { fontSize: 14, color: '#666' },
  taskDuration: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  usedMaterialsLabel: { fontSize: 14, fontWeight: '500', marginTop: 8 },
  producedMaterialsLabel: { fontSize: 14, fontWeight: '500', marginTop: 8 },
  materialList: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  materialItem: { backgroundColor: '#f0f0f0', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10, marginRight: 8, marginBottom: 8 },
  removeButton: { position: 'absolute', top: 8, right: 8, padding: 4 },
  emptyStateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  emptyStateText: { fontSize: 16, color: '#999' },
  emptyStateButton: { marginTop: 16, backgroundColor: '#007AFF', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 },
  emptyStateButtonText: { color: 'white', fontWeight: '500' },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d9534f',
  },
  secondaryButtonText: {
    color: '#d9534f',
    fontWeight: '500',
    fontSize: 16,
  },
});
