import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Alert } from 'react-native';
import TaskGroupForm from '@/components/task-group/task-group-form';
import { useTaskGroups } from '@/hooks/use-task-groups';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/app/_i18n';
import Header from '../components/header';

export default function NewTaskGroupScreen() {
  const { t } = useTranslation();
  const { create } = useTaskGroups();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (data: any) => {
    try {
      setIsSaving(true);
      await create(data);
      // navigate back to the list
      router.replace('/task-groups');
    } catch (err: any) {
      console.error('Failed to create task group', err);
      Alert.alert(t('error') || 'Error', err?.message || 'Failed to create task group');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title={t('newTaskGroup') || 'New Task Group'} />
      {isSaving ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 12 }}>{t('loading') || 'Saving...'}</Text>
        </View>
      ) : (
        <TaskGroupForm onSubmit={handleSubmit} onClose={() => router.back()} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
