import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Alert } from 'react-native';
import EmployeeTasksForm from '@/components/employee-tasks/employee-tasks-form';
import { useWorkDayPlan } from '@/hooks/use-work-day-plan';
import { useUsers } from '@/hooks/use-users';
import { useTaskGroups } from '@/hooks/use-task-groups';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from '@/app/_i18n';
import Header from '../components/header';

export default function EditEmployeeTasksScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();
  const { plan, save } = useWorkDayPlan(typeof date === 'string' ? date : undefined);
  const { users } = useUsers();
  const { taskGroups } = useTaskGroups();

  const [assignment, setAssignment] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    try {
      if (!plan) {
        setAssignment(null);
        setIsLoading(false);
        return;
      }
      const a = (plan.assignments || []).find((as: any) => String(as.user._id || as.user) === String(id));
      setAssignment(a || { user: id, tasks: [] });
    } catch (err: any) {
      console.error('Failed to load assignment', err);
      Alert.alert(t('error') || 'Error', err?.message || 'Failed to load assignment');
    } finally {
      setIsLoading(false);
    }
  }, [plan, id, t]);

  const employeeName = (() => {
    try {
      const u = users?.find((uu: any) => String(uu._id) === String(id));
      return u?.name || (u?._id ?? id);
    } catch {
      return id;
    }
  })();

  // Format a Date to local YYYY-MM-DD (avoid toISOString which uses UTC)
  const formatDateLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Helper to navigate to plan-work-day for a given ISO date string.
  const navigateToPlanForDate = (d: string) => {
    // Use an encoded query string path as a fallback, but prefer the typed object form.
    const path = `/plan-work-day?date=${encodeURIComponent(d)}`;
    try {
      // Preferred: use the object form which matches the router types (pathname + params)
      router.replace({ pathname: '/plan-work-day', params: { date: d } });
    } catch {
      // fallback: some router implementations accept a raw path string; cast to any to satisfy TS
      try {
        router.replace(path as any);
      } catch {
        // last resort: push the path
        router.push(path as any);
      }
    }
  };

  const handleSubmit = async (tasks: any[]) => {
    if (!plan) {
      Alert.alert(t('error') || 'Error', t('noPlanLoaded') || 'No plan loaded for this date');
      return;
    }
    setIsSaving(true);
    try {
      const newAssignments = (plan.assignments || []).map((a: any) => {
        if (String(a.user._id || a.user) === String(id)) {
          return {...a, tasks };
        }
        return a;
      });
      // if assignment didn't exist, add it
      const exists = newAssignments.find((a: any) => String(a.user._id || a.user) === String(id));
      const finalAssignments = exists ? newAssignments : [...newAssignments, { user: id, tasks }];
      const saveDate = typeof date === 'string' ? date : formatDateLocal(new Date());
      await save({ date: saveDate, assignments: finalAssignments });
      // Always navigate to the plan page for the saved date (replace to avoid stacking routes)
      navigateToPlanForDate(saveDate);
    } catch (err: any) {
      console.error('Failed to save assignment tasks', err);
      Alert.alert(t('error') || 'Error', err?.message || 'Failed to save tasks');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Header title={t('employeeTasks') || 'Employee Tasks'} />
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 12 }}>{t('loading') || 'Loading...'}</Text>
        </View>
      </View>
    );
  }

  if (!assignment) {
    return (
      <View style={styles.container}>
        <Header title={t('employeeTasks') || 'Employee Tasks'} />
        <Text style={styles.empty}>{t('noAssignmentFound') || 'Assignment not found for this user'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title={employeeName || (t('employeeTasks') || 'Employee Tasks')} />
      <EmployeeTasksForm
        initialTasks={assignment.tasks || []}
        onSubmit={handleSubmit}
        onClose={() => {
          const closeDate = typeof date === 'string' ? date : formatDateLocal(new Date());
          navigateToPlanForDate(closeDate);
        }}
        isSaving={isSaving}
        employeeName={employeeName}
        date={typeof date === 'string' ? date : formatDateLocal(new Date())}
        taskGroups={taskGroups}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', color: '#666', marginTop: 24 },
});
