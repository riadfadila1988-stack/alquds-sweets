import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Alert } from 'react-native';
import TaskGroupForm from '@/components/task-group/task-group-form';
import { useTaskGroups } from '@/hooks/use-task-groups';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/app/_i18n';
import Header from '../components/header';
import {ScreenTemplate} from "@/components/ScreenTemplate";

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
      // router.replace('/task-groups');
    } catch (err: any) {
      console.error('Failed to create task group', err);
      Alert.alert(t('error') || 'Error', err?.message || 'Failed to create task group');
    } finally {
      setIsSaving(false);
    }
  };

  return (
      <ScreenTemplate title={t('newTaskGroup') || 'New Task Group'}>
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <TaskGroupForm
          onSubmit={handleSubmit}
        />
        {isSaving && (
          <View style={styles.centerOverlay} pointerEvents="none">
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 12 }}>{t('saving') || 'Saving...'}</Text>
          </View>
        )}
      </View>
    </View>
      </ScreenTemplate>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1,},
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerOverlay: { position: 'absolute', left: 0, right: 0, top: 60, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.6)' },
});
