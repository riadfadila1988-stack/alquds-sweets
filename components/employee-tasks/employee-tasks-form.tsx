import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Modal, FlatList, Keyboard, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  otherEmployees?: { id: string; name: string }[];
  onMoveTask?: (task: any, targetUserId: string) => void;
}

export default function EmployeeTasksForm({ initialTasks = [], onSubmit, onClose, isSaving = false, employeeName, taskGroups = [], date, otherEmployees = [], onMoveTask }: EmployeeTasksFormProps) {
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
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [taskToMove, setTaskToMove] = useState<any | null>(null);

  // Store latest task data in ref to avoid re-renders on field changes (preserves keyboard focus)
  const tasksDataRef = useRef<any[]>(tasks);

  useEffect(() => {
    const newTasks = (initialTasks || []).map((it: any) => ({ ...it, _key: it._key ?? it._id ?? makeKey() }));
    setTasks(newTasks);
    tasksDataRef.current = newTasks;
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
      // Preserve start time if the template task has one
      startAt: t.startAt ?? t.startAtString ?? undefined,
      startAtString: t.startAtString ?? undefined,
    }));
    setTasks(prev => {
      const newArr = [...prev, ...tasksOnly];
      tasksDataRef.current = newArr; // Keep ref in sync
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

  // Update a task by its stable key. We avoid relying on a visual index because the list
  // renders a filtered `visibleTasks` which may not match the full `tasks` index.
  // Update the ref directly without triggering state update to preserve keyboard focus
  const handleTaskChange = useCallback((newTask: any) => {
    if (!newTask) return;
    const key = newTask._key ?? newTask._id;

    if (key) {
      const found = tasksDataRef.current.findIndex((t: any) => (t?._key ?? t?._id) === key);
      if (found >= 0) {
        tasksDataRef.current[found] = { ...tasksDataRef.current[found], ...newTask };
      }
    }
    // Don't call setTasks to avoid re-rendering the list and losing keyboard focus
    // The data is stored in the ref and will be used during submit
  }, []);

  const addTask = () => {
    const newTask = { _key: makeKey(), name: '', duration: 0, description: '', usedMaterials: [], producedMaterials: [] };
    setTasks(prev => {
      const newArr = [...prev, newTask];
      tasksDataRef.current = newArr; // Keep ref in sync
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
    setTasks(prev => {
      const updated = prev.filter(t => t._key !== key);
      tasksDataRef.current = updated; // Keep ref in sync
      return updated;
    });
  };

  // We'll keep refs to child Task rows so we can flush their local state before submitting.
  const taskRowRefs = useRef<Record<string, any>>({});

  const handleSubmit = () => {
    // Flush local state from child Task components (they expose `flush` via ref)
    const flushed: Record<string, any> = {};
    try {
      Object.keys(taskRowRefs.current).forEach(k => {
        const r = taskRowRefs.current[k];
        if (r && typeof r.flush === 'function') {
          try {
            const payload = r.flush();
            if (payload && (payload._key ?? payload._id)) {
              flushed[payload._key ?? payload._id] = payload;
            }
          } catch { /* ignore individual flush errors */ }
        }
      });
    } catch { /* ignore */ }

    // Use tasksDataRef (most up-to-date) and merge with flushed payloads
    const nextTasks = tasksDataRef.current.map(t => {
      const key = t._key ?? t._id;
      if (key && flushed[key]) return { ...t, ...flushed[key] };
      return t;
    });

    // Update state with final data before submitting
    setTasks(nextTasks);
    tasksDataRef.current = nextTasks;
    onSubmit(nextTasks);
  };

  const handleDragEnd = ({ data }: { data: any[] }) => {
    setTasks(data);
    tasksDataRef.current = data; // Keep ref in sync
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
          {/* Move Task Button - under drag icon */}
          {onMoveTask && otherEmployees && otherEmployees.length > 0 && (
            <TouchableOpacity
              style={{ marginTop: 12 }}
              onPress={() => {
                setTaskToMove(task);
                setShowMoveModal(true);
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialIcons name="person-add-alt-1" size={20} color="#4FACFE" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        <View style={styles.taskContent}>
          <Task
            task={task}
            // Pass only the updated task object; parent will find it by key
            onChange={(newTask) => handleTaskChange(newTask)}
            // Use key-based removal to ensure the correct task is removed
            onRemove={() => removeTaskByKey(task._key)}
            index={taskIndex}
            // Attach a ref so we can call `flush()` on submit to capture any local edits that
            // haven't been flushed via onBlur yet (name/description/duration).
            ref={(r: any) => {
              try {
                const key = task?._key ?? task?._id;
                if (!key) return;
                if (r) taskRowRefs.current[key] = r;
                else delete taskRowRefs.current[key];
              } catch (e) {
                // ignore
              }
            }}
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
          <View style={styles.modalHeader}>
            <MaterialIcons name="playlist-play" size={24} color="#FF6B9D" />
            <Text style={styles.modalTitle}>{t('taskGroups') || 'Task Groups'}</Text>
          </View>
          <FlatList
            data={taskGroups}
            keyExtractor={(g: any) => String(g._id ?? g.id ?? g.name)}
            renderItem={({ item: g }) => (
              <TouchableOpacity
                style={styles.groupBtnContainer}
                onPress={() => { addTaskGroup(g); setShowGroupsModal(false); }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#4FACFE', '#00F2FE']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.groupBtn}
                >
                  <MaterialIcons name="playlist-add-check" size={20} color="#fff" />
                  <Text style={styles.groupBtnText}>{g.name}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={true}
          />
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowGroupsModal(false)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="close" size={18} color="#FF6B9D" />
              <Text style={styles.modalCancelText}>{t('cancel') || 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderMoveTaskModal = () => (
    <Modal visible={showMoveModal} transparent animationType="slide" onRequestClose={() => setShowMoveModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalInner, { maxHeight: '60%' }]}>
          <View style={styles.modalHeader}>
            <MaterialIcons name="person-add" size={24} color="#4FACFE" />
            <Text style={styles.modalTitle}>{t('moveTaskTo') || 'Move Task To...'}</Text>
          </View>
          <Text style={{ marginBottom: 12, color: '#666' }}>
            {t('moveTaskConfirmation') || 'Select an employee to assign this task to:'}
          </Text>
          <FlatList
            data={otherEmployees}
            keyExtractor={(e) => e.id}
            renderItem={({ item: emp }) => (
              <TouchableOpacity
                style={styles.groupBtnContainer}
                onPress={() => {
                  if (taskToMove && onMoveTask) {
                    onMoveTask(taskToMove, emp.id);
                    setShowMoveModal(false);
                    setTaskToMove(null);
                  }
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#4FACFE', '#00F2FE']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.groupBtn}
                >
                  <MaterialIcons name="person" size={20} color="#fff" />
                  <Text style={styles.groupBtnText}>{emp.name}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={true}
          />
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => {
                setShowMoveModal(false);
                setTaskToMove(null);
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="close" size={18} color="#FF6B9D" />
              <Text style={styles.modalCancelText}>{t('cancel') || 'Cancel'}</Text>
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
        <LinearGradient
          colors={['#ffffff', '#f8f9ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <View style={[styles.headerRow, isRTL && styles.headerRowRtl]}>
            <View style={{ flexDirection: 'column', flex: 1 }}>
              <View style={styles.employeeNameRow}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{employeeName?.charAt(0) || 'E'}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.employeeNameText, isRTL && styles.labelRtl]}>
                    {employeeName || (t('employeeTasks') || 'Employee Tasks')}
                  </Text>
                  {displayDate ? (
                    <View style={styles.dateRow}>
                      <MaterialIcons name="event" size={14} color="#FF6B9D" />
                      <Text style={styles.dateText}>{displayDate}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
            <View style={[styles.headerActions, isRTL && styles.headerActionsRtl]}>
              {taskGroups && taskGroups.length > 0 && (
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => setShowGroupsModal(true)}
                  accessibilityLabel={t('addTaskGroup') || 'Add Task Group'}
                  activeOpacity={0.75}
                >
                  <LinearGradient
                    colors={['#4FACFE', '#00F2FE']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.iconBtnGradient}
                  >
                    <MaterialIcons name="playlist-add" size={20} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={addTask}
                accessibilityLabel={t('addTask') || 'Add Task'}
                activeOpacity={0.75}
              >
                <LinearGradient
                  colors={['#FF6B9D', '#C86DD7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.iconBtnGradient}
                >
                  <MaterialIcons name="add" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Top action buttons (Submit / Cancel) moved from footer */}
        <View style={[styles.topButtonsContainer, isRTL && styles.topButtonsContainerRtl]}>
          <View style={[styles.buttonContainer, isRTL && styles.buttonContainerRtl]}>
            {/* show a spinner beside the button only while saving; position respects RTL */}
            <TouchableOpacity
              style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSaving}
              accessibilityLabel={isSaving ? (t('saving') || 'Saving...') : (t('submit') || 'Submit')}
            >
              <LinearGradient
                colors={['#4FACFE', '#00F2FE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButtonGradient}
              >
                {isSaving && (
                  <ActivityIndicator
                    size="small"
                    color="#fff"
                    style={isRTL ? { marginLeft: 8 } : { marginRight: 8 }}
                  />
                )}
                <MaterialIcons name="save" size={18} color="#fff" />
                <View style={{ width: 8 }} />
                <Text style={styles.primaryButtonText}>{isSaving ? (t('saving') || 'Saving...') : (t('submit') || 'Submit')}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onClose}
              accessibilityLabel={t('cancel') || 'Cancel'}
            >
              <MaterialIcons name="close" size={18} color="#FF6B9D" />
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
        {renderMoveTaskModal()}
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 140,
    paddingHorizontal: 16,
  },
  headerCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  employeeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B9D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  employeeNameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3748',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#7b8aa1',
    marginLeft: 6,
    fontWeight: '500',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    color: '#2d3748',
  },
  labelRtl: {
    textAlign: 'right',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRowRtl: {
    flexDirection: 'row-reverse',
  },
  headerActionsRtl: {
    flexDirection: 'row-reverse',
  },
  iconBtn: {
    marginLeft: 8,
  },
  iconBtnGradient: {
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonFull: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#e0e7ff',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9ff',
    marginTop: 12,
  },
  draggableTaskContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  draggableTaskActive: {
    opacity: 0.9,
    transform: [{ scale: 1.02 }],
  },
  dragHandle: {
    width: 40,
    paddingTop: 16,
    paddingRight: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  dragHandleRtl: {
    paddingRight: 0,
    paddingLeft: 8,
  },
  taskContent: {
    flex: 1,
  },
  topButtonsContainer: {
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  topButtonsContainerRtl: {
    flexDirection: 'row-reverse',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingBottom: 32,
  },
  footerRtl: {
    flexDirection: 'row-reverse',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  buttonContainerRtl: {
    flexDirection: 'row-reverse',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInner: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d3748',
    marginLeft: 12,
  },
  groupBtnContainer: {
    marginBottom: 12,
  },
  groupBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#4FACFE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  groupBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalFooter: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B9D',
    backgroundColor: '#fff',
  },
  modalCancelText: {
    color: '#FF6B9D',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 6,
  },
  smallBtn: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  labelSmall: {
    fontSize: 14,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#e6e6e6',
    marginVertical: 8,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '500',
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
  },
  taskDuration: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  usedMaterialsLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  producedMaterialsLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  materialList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  materialItem: {
    backgroundColor: '#e0e7ff',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
  },
  emptyStateButton: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#4FACFE',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#FF6B9D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryButtonText: {
    color: '#FF6B9D',
    fontWeight: '600',
    fontSize: 16,
  },
});
