import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, KeyboardAvoidingView, Keyboard } from 'react-native';
import { ITaskGroup, ITask, IUsedMaterial } from '@/types/task-group';
import { useTranslation } from '@/app/_i18n';
import { MaterialIcons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import Task from './task';

interface TaskGroupFormProps {
  initialData?: ITaskGroup;
  onSubmit: (data: Partial<ITaskGroup>) => void;
  onClose: () => void;
  isSaving?: boolean; // added: allow parent to tell form it's saving so we don't unmount it
}

export default function TaskGroupForm({ initialData, onSubmit, onClose, isSaving = false }: TaskGroupFormProps) {
  const { t } = useTranslation();
  const isRTL = true;
  const nextIdRef = useRef<number>(0);
  const makeKey = () => `task-${Date.now()}-${(nextIdRef.current++).toString(36)}`;
  const [name, setName] = useState(initialData?.name || '');
  // ensure stable keys for DraggableFlatList; add _key where missing
  const [tasks, setTasks] = useState<Partial<ITask & { _key?: string }>[]>(() =>
    (initialData?.tasks || []).map((t: any) => ({ ...t, _key: t._key ?? t._id ?? makeKey() })),
  );
  const listRef = useRef<any>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setTasks((initialData.tasks || []).map((t: any) => ({ ...t, _key: t._key ?? t._id ?? makeKey() })));
    }
  }, [initialData]);

  const handleTaskChange = (index: number, newTask: Partial<ITask>) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], ...newTask } as any;
    setTasks(newTasks);
  };

  const addTask = () => {
    const newTask = { _key: makeKey(), name: '', duration: 0, description: '', usedMaterials: [], producedMaterials: [] } as any;
    setTasks(prev => [...prev, newTask]);
  };

  const removeTaskByKey = (key: string) => {
    setTasks(prev => prev.filter(t => (t as any)._key !== key));
  };

  const handleSubmit = () => {
    const taskGroupData: Partial<ITaskGroup> = {
      name,
      // produce a proper ITask[] shape for the API by providing defaults for missing fields
      tasks: tasks.map((task: any) => ({
        _id: task._id,
        name: task.name ?? '',
        duration: task.duration ?? 0,
        description: task.description ?? '',
        usedMaterials: (task.usedMaterials || []).map((um: any) => ({
          material: (um as any)?.material?._id ?? (um as any)?.material,
          quantity: (um as any)?.quantity ?? 0,
        })) as IUsedMaterial[],
        producedMaterials: (task.producedMaterials || []).map((pm: any) => ({
          material: (pm as any)?.material?._id ?? (pm as any)?.material,
          quantity: (pm as any)?.quantity ?? 0,
        })) as IUsedMaterial[],
      })) as any,
    };
    onSubmit(taskGroupData);
  };

  const renderListHeader = () => (
    <View>
      <Text style={[styles.label, isRTL && styles.labelRtl]}>{t('groupName') || 'Group Name'}</Text>
      <TextInput style={[styles.input, isRTL && styles.inputRtl]} value={name} onChangeText={setName} />

      <View style={[styles.headerRow, isRTL && styles.headerRowRtl]}>
        <Text style={[styles.label, isRTL && styles.labelRtl]}>{t('tasks') || 'Tasks'}</Text>
        {tasks.length === 0 && (
          <TouchableOpacity style={styles.iconButton} onPress={addTask} accessibilityLabel={t('addTask') || 'Add Task'}>
            <MaterialIcons name="add" size={24} color="#007AFF" style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderListFooter = () => (
    <View>
      {/* If there are existing tasks, show the Add button after the list */}
      {tasks.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <TouchableOpacity
            style={[styles.addButtonFull, isRTL && styles.headerRowRtl]}
            onPress={addTask}
            accessibilityLabel={t('addTask') || 'Add Task'}
            activeOpacity={0.75}
          >
            <MaterialIcons name="add" size={28} color="#007AFF" style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
          </TouchableOpacity>
        </View>
      )}
      {/* spacer so content doesn't get hidden behind the fixed footer */}
      <View style={{ height: 120 }} />
    </View>
  );

  // Small inner component for a task row to manage local press timer for starting drag
  function TaskRow({ task, taskIndex, drag, isActive }: { task: any; taskIndex: number; drag: () => void; isActive: boolean }) {
    const pressTimer = useRef<any>(null);
    const handlePressIn = () => {
      // start timer to begin drag after 600ms
      pressTimer.current = setTimeout(() => {
        try { drag(); } catch { }
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
            onRemove={() => removeTaskByKey((task as any)._key ?? (task as any)._id)}
            index={taskIndex}
          />
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <DraggableFlatList
          ref={listRef}
          data={tasks}
          // enable smooth nested scrolling while dragging
          nestedScrollEnabled
          activationDistance={20}
          dragItemOverflow
          onDragBegin={() => { Keyboard.dismiss(); /* optional debug */ }}
          onDragEnd={({ data }) => { setTasks(data); Keyboard.dismiss(); }}
          onRelease={() => { Keyboard.dismiss(); }}
          keyExtractor={(item: any, index) => (item?._key ?? item?._id ?? `task-${index}`)}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderListFooter}
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item: task, index: taskIndex, drag, isActive }: RenderItemParams<any>) => (
            <TaskRow task={task} taskIndex={taskIndex} drag={drag} isActive={isActive} />
          )}
        />

        {/* Fixed footer with Submit/Cancel buttons */}
        <View style={[styles.footer, isRTL && styles.footerRtl]} pointerEvents="box-none">
          <View style={[styles.buttonContainer, isRTL && styles.buttonContainerRtl]}>
            <TouchableOpacity style={[styles.footerBtn, isSaving && styles.buttonDisabled]} onPress={handleSubmit} disabled={isSaving}>
              <Text style={styles.footerBtnText}>{isSaving ? (t('saving') || 'Saving...') : (t('submit') || 'Submit')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: '#e53e3e' }]} onPress={onClose}>
              <Text style={[styles.footerBtnText]}>{t('cancel') || 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  // ensure ScrollView content container exists so content can be padded/centered
  scrollContainer: { flexGrow: 1, paddingBottom: 140 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  labelRtl: { textAlign: 'right' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 4, marginTop: 6 },
  inputRtl: { textAlign: 'right' },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  addButtonFull: { width: '100%', borderWidth: 1, borderColor: '#e6e6e6', borderRadius: 8, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  draggableTaskContainer: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 },
  draggableTaskActive: { opacity: 0.8, transform: [{ scale: 1.02 }] },
  dragHandle: { width: 40, paddingTop: 16, paddingRight: 8, alignItems: 'center', justifyContent: 'flex-start' },
  dragHandleRtl: { paddingRight: 0, paddingLeft: 8 },
  taskContent: { flex: 1 },
  iconButtonSmall: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  iconButtonRemove: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  iconButtonRemoveRtl: { marginLeft: 0, marginRight: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  headerRowRtl: { flexDirection: 'row-reverse' },
  headerRowSmall: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  collapseButton: { marginRight: 8 },
  collapseButtonRtl: { marginRight: 0, marginLeft: 8 },
  // taskCard: visible bordered box with cross-platform shadow
  taskCard: {
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 12,
    position: 'relative',
    // border
    borderWidth: 1,
    borderColor: '#e6e6e6',
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    // Android elevation
    elevation: 4,
  },
  taskContainerInner: { paddingTop: 8 },
  clearButton: { position: 'absolute', top: -10, left: -10, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee' },
  clearButtonRtl: { left: undefined, right: -10 },
  clearButtonText: { fontSize: 16, color: '#333' },
  materialContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, justifyContent: 'space-between' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8, marginBottom: 8, width: '100%' },
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    // Android elevation
    elevation: 6,
    zIndex: 50,
  },
  footerRtl: { flexDirection: 'row-reverse' },
  buttonContainerRtl: { flexDirection: 'row-reverse' },
  materialSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#ddd', padding: 8, borderRadius: 6, width: '40%' },
  materialSelectorText: { flex: 1, color: '#333' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 8, maxHeight: '80%', width: '90%', padding: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalHeaderRtl: { flexDirection: 'row-reverse' },
  modalTitle: { fontSize: 16, fontWeight: '600' },
  modalClose: { padding: 6 },
  modalSearch: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 6, marginBottom: 8 },
  modalItem: { paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#f1f1f1' },
  modalItemText: { fontSize: 14 },
  footerBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    backgroundColor: '#007AFF',
  },
  footerBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
});
