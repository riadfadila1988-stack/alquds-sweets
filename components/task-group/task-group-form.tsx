import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Button, ScrollView, TouchableOpacity, I18nManager, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { ITaskGroup, ITask, IUsedMaterial } from '@/types/task-group';
import { useTranslation } from '@/app/_i18n';
import { MaterialIcons } from '@expo/vector-icons';
import Task from './task';

interface TaskGroupFormProps {
  initialData?: ITaskGroup;
  onSubmit: (data: Partial<ITaskGroup>) => void;
  onClose: () => void;
  isSaving?: boolean; // added: allow parent to tell form it's saving so we don't unmount it
}

export default function TaskGroupForm({ initialData, onSubmit, onClose, isSaving = false }: TaskGroupFormProps) {
  const { t } = useTranslation();
  // detect RTL from React Native's I18nManager
  const isRTL = I18nManager.isRTL;
  const [name, setName] = useState(initialData?.name || '');
  const [tasks, setTasks] = useState<Partial<ITask>[]>(initialData?.tasks || []);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setTasks(initialData.tasks);
    }
  }, [initialData]);

  const handleTaskChange = (index: number, newTask: Partial<ITask>) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], ...newTask } as any;
    setTasks(newTasks);
  };

  const addTask = () => {
    setTasks([...tasks, { name: '', duration: 0, description: '', usedMaterials: [], producedMaterials: [] }]);
  };

  const removeTask = (index: number) => {
    const newTasks = [...tasks];
    newTasks.splice(index, 1);
    setTasks(newTasks);
  };

  const handleSubmit = () => {
    const taskGroupData: Partial<ITaskGroup> = {
      name,
      // produce a proper ITask[] shape for the API by providing defaults for missing fields
      tasks: tasks.map(task => ({
        _id: task._id,
        name: task.name ?? '',
        duration: task.duration ?? 0,
        description: task.description ?? '',
        usedMaterials: (task.usedMaterials || []).map(um => ({
          material: (um as any)?.material?._id ?? (um as any)?.material,
          quantity: (um as any)?.quantity ?? 0,
        })) as IUsedMaterial[],
        producedMaterials: (task.producedMaterials || []).map(pm => ({
          material: (pm as any)?.material?._id ?? (pm as any)?.material,
          quantity: (pm as any)?.quantity ?? 0,
        })) as IUsedMaterial[],
      })) as any,
    };
    onSubmit(taskGroupData);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.label, isRTL && styles.labelRtl]}>{t('groupName') || 'Group Name'}</Text>
          <TextInput style={[styles.input, isRTL && styles.inputRtl]} value={name} onChangeText={setName} />

          <View style={[styles.headerRow, isRTL && styles.headerRowRtl]}>
            <Text style={[styles.label, isRTL && styles.labelRtl]}>{t('tasks') || 'Tasks'}</Text>
            <TouchableOpacity style={styles.iconButton} onPress={addTask} accessibilityLabel={t('addTask') || 'Add Task'}>
              {/* Mirror icon in RTL so it visually matches direction */}
              <MaterialIcons name="add" size={24} color="#007AFF" style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
            </TouchableOpacity>
          </View>

          {tasks.map((task, taskIndex) => (
            <Task
              key={taskIndex}
              task={task}
              onChange={(newTask) => handleTaskChange(taskIndex, newTask)}
              onRemove={() => removeTask(taskIndex)}
              index={taskIndex}
            />
          ))}

          <View style={[styles.buttonContainer, isRTL && styles.buttonContainerRtl]}>
             <Button  title={isSaving ? (t('saving') || 'Saving...') : (t('submit') || 'Submit')} onPress={handleSubmit} disabled={isSaving} />
             <Button title={t('cancel') || 'Cancel'} onPress={onClose} color="red" />
           </View>
         </ScrollView>
       </TouchableWithoutFeedback>
     </KeyboardAvoidingView>
   );
 }

 const styles = StyleSheet.create({
   container: { flex: 1, padding: 16, },
   // ensure ScrollView content container exists so content can be padded/centered
   scrollContainer: { flexGrow: 1, paddingBottom: 30 },
   label: { fontSize: 16, fontWeight: '600', marginTop: 12 },
   labelRtl: { textAlign: 'right' },
   input: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 4, marginTop: 6 },
   inputRtl: { textAlign: 'right' },
   iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
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
   buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 24, marginBottom: 30 },
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
 });
