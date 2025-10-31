import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Alert } from 'react-native';
import TaskGroupForm from '@/components/task-group/task-group-form';
import { useTaskGroups } from '@/hooks/use-task-groups';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getTaskGroupById } from '@/services/task-group';
import { useTranslation } from '@/app/_i18n';
import { ITaskGroup } from '@/types/task-group';
import Header from '../components/header';

export default function EditTaskGroupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { update } = useTaskGroups();

  const [taskGroup, setTaskGroup] = useState<ITaskGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    // if route was used to create a new group via dynamic route, redirect to the dedicated new page
    if (id === 'new') {
      router.replace('/task-groups/new');
      return;
    }

    let mounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await getTaskGroupById(String(id));
        if (mounted) setTaskGroup(data);
      } catch (err: any) {
        console.error('Failed to load task group', err);
        const msg = err?.message || (t('error') || 'Failed to load task group');
        if (mounted) setError(msg);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
    // include router and t to satisfy react-hooks/exhaustive-deps
  }, [id, router, t]);

  const handleSubmit = async (data: Partial<ITaskGroup>) => {
    if (!id) return;
    try {
      setIsSaving(true);
      await update({ id: String(id), data });
      router.replace('/task-groups');
    } catch (err: any) {
      console.error('Failed to update task group', err);
      Alert.alert(t('error') || 'Error', err?.message || 'Failed to update task group');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Header title={t('loading') || 'Loading'} />
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 12 }}>{t('loading') || 'Loading...'}</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header title={t('error') || 'Error'} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!taskGroup) {
    return (
      <View style={styles.container}>
        <Header title={t('taskGroup') || 'Task Group'} />
        <Text style={styles.empty}>{t('r') || 'Task group not found'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title={taskGroup.name || t('taskGroup') || 'Task Group'} />
      <TaskGroupForm initialData={taskGroup} onSubmit={handleSubmit} onClose={() => router.back()} isSaving={isSaving} />
      {isSaving && (
        <View style={styles.centerOverlay} pointerEvents="none">
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 12 }}>{t('saving') || 'Saving...'}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: 'red', textAlign: 'center', marginTop: 20 },
  empty: { textAlign: 'center', color: '#666', marginTop: 24 },
  centerOverlay: { position: 'absolute', left: 0, right: 0, top: 60, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.6)' },
});
