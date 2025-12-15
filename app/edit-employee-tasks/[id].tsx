import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import EmployeeTasksForm from '@/components/employee-tasks/employee-tasks-form';
import { useWorkDayPlan } from '@/hooks/use-work-day-plan';
import { useUsers } from '@/hooks/use-users';
import { useTaskGroups } from '@/hooks/use-task-groups';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from '@/app/_i18n';
import { ScreenTemplate } from "@/components/ScreenTemplate";

export default function EditEmployeeTasksScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();
    const { plan, updateEmployeeTasks, save } = useWorkDayPlan(typeof date === 'string' ? date : undefined);
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
            const saveDate = typeof date === 'string' ? date : formatDateLocal(new Date());
            await updateEmployeeTasks({ date: saveDate, userId: id, tasks });
            // Always navigate to the plan page for the saved date (replace to avoid stacking routes)
            navigateToPlanForDate(saveDate);
        } catch (err: any) {
            console.error('Failed to save assignment tasks', err);
            Alert.alert(t('error') || 'Error', err?.message || 'Failed to save tasks');
        } finally {
            setIsSaving(false);
        }
    };

    const otherEmployees = React.useMemo(() => {
        if (!plan?.assignments) return [];
        return plan.assignments
            .filter((a: any) => String(a.user._id || a.user) !== String(id))
            .map((a: any) => {
                // Try to resolve user name from users list if possible, otherwise use what's in assignment or ID
                const uid = typeof a.user === 'object' ? a.user._id : a.user;
                const uName = typeof a.user === 'object' ? a.user.name : (users?.find((u: any) => u._id === uid)?.name || uid);
                return { id: uid, name: uName };
            });
    }, [plan, id, users]);

    const handleMoveTask = async (task: any, targetUserId: string) => {
        if (!plan) return;
        setIsSaving(true);
        try {
            // We need a stable identifier. task._id is standard, but task._key is used effectively in the form.
            // Ideally use _id if available, else _key.
            const taskId = task._id || task._key;

            // 1. Remove from current user
            // Filter out the task from locally stored assignment or current plan assignment
            // However, `updateEmployeeTasks` expects the FULL NEW LIST of tasks for this user.
            // But we also need to ADD to the other user. `updateEmployeeTasks` only updates ONE user.
            // So we should probably use `save` which takes the whole plan assignments, OR call `updateEmployeeTasks` twice?
            // `save` replaces the whole assignments array or merges? `createOrUpdateWorkDayPlan` (which `save` calls) usually overwrites assignments 
            // BUT `updateEmployeeTasks` is safer if we only want to touch specific users.
            // Actually, `save` (createOrUpdateWorkDayPlan) usually expects the full structure.
            // Let's use `save` with the full modified assignments to be atomic if possible,
            // OR use `updateEmployeeTasks` twice.
            // `updateEmployeeTasks` backend likely just sets the tasks for that user.
            // If I do it sequentially, there's a small risk of data race if another user edits, but for now reasonable.
            // BETTER: Modify `assignments` locally and save the whole plan to ensure consistency.

            // Deep clone assignments
            const newAssignments = JSON.parse(JSON.stringify(plan.assignments));

            // Find current user assignment
            const currentAssignmentIndex = newAssignments.findIndex((a: any) => String(a.user._id || a.user) === String(id));
            if (currentAssignmentIndex === -1) throw new Error("Current user assignment not found");

            const currentTasks = newAssignments[currentAssignmentIndex].tasks || [];
            // Remove task
            const taskIndex = currentTasks.findIndex((t: any) => (t._id && t._id === taskId) || (t._key && t._key === taskId));
            if (taskIndex === -1) {
                // If not found by ID, maybe it's a new task not yet saved? 
                // If it's unsaved, we can just move it.
                // But `task` comes from the form, so it might have latest changes.
            }
            // Actually, we should use the task object passed to us which might have unsaved edits?
            // User intention: "Remove from current employee... add to selected employee".
            // Since we are in "Edit Employee Tasks" screen, the user might have made other local edits (reordering) 
            // that are NOT yet saved to `plan`. 
            // But `handleMoveTask` is triggered from the list.
            // If I save the whole plan, I might overwrite other users' parallel edits? 
            // `createOrUpdateWorkDayPlan` acts as an upsert/overwrite for the whole plan document in many simple implementations.
            // Let's check `updateEmployeeTasks` again. It takes tasks.
            // Safe approach:
            // 1. Get current tasks from the FORM (which might be passed or we rely on `assignment` state if it was updated?) 
            //    Wait, `assignment` state in this component is just initial data. The form maintains the state.
            //    When `handleMoveTask` is called, we should assume the `task` is the one to move.
            //    We need to remove it from the *current user's* task list and add it to *target user's* list.
            //    AND we need to save *both* changes.

            // Let's just update `plan.assignments` locally and call `save`.

            // Remove from current
            const taskToMove = { ...task };
            // Ensure unique key for new list just in case
            delete taskToMove._key;

            newAssignments[currentAssignmentIndex].tasks = currentTasks.filter((t: any) => String(t._id || t._key) !== String(taskId));

            // Add to target
            const targetIndex = newAssignments.findIndex((a: any) => String(a.user._id || a.user) === String(targetUserId));
            if (targetIndex === -1) throw new Error("Target user assignment not found");

            if (!newAssignments[targetIndex].tasks) newAssignments[targetIndex].tasks = [];
            newAssignments[targetIndex].tasks.push(taskToMove);

            const saveDate = typeof date === 'string' ? date : formatDateLocal(new Date());

            // We use `save` from useWorkDayPlan which calls `createOrUpdateWorkDayPlan`
            await save({ date: saveDate, assignments: newAssignments });

            // Reload/navigate to plan or just refresh?
            // Ideally we just want to refresh the current view or close/re-init.
            // The `save` hook invalidates queries, so `plan` should update.
            // But `EditEmployeeTasksScreen` uses `assignment` state initialized in useEffect from `plan`.
            // So if `plan` updates, `useEffect` [plan] will fire and update `assignment`.
            // However, we want to make sure the user sees the task gone.

            // Just return success, the query update will handle UI?
            // The form keeps local state. We might need to tell the form to remove it?
            // Actually, if we re-render parent with new `assignment`, the form `useEffect` [initialTasks] will reset data.
            // That works.

        } catch (err: any) {
            console.error('Failed to move task', err);
            Alert.alert(t('error') || 'Error', err?.message || 'Failed to move task');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <ScreenTemplate
                title={t('loading') || 'Loading...'}
                headerGradient={['#FF6B9D', '#4FACFE', '#C86DD7']}
            >
                <View style={styles.centerContainer}>
                    <LinearGradient
                        colors={['#FF6B9D', '#4FACFE']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.loadingCard}
                    >
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={styles.loadingText}>{t('loading') || 'Loading...'}</Text>
                    </LinearGradient>
                </View>
            </ScreenTemplate>
        );
    }

    if (!assignment) {
        return (
            <ScreenTemplate
                title={t('error') || 'Error'}
                headerGradient={['#FF6B9D', '#4FACFE', '#C86DD7']}
            >
                <View style={styles.centerContainer}>
                    <LinearGradient
                        colors={['#FFA726', '#FB8C00']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.errorCard}
                    >
                        <MaterialIcons name="error-outline" size={48} color="#fff" />
                        <Text style={styles.errorText}>
                            {t('noAssignmentFound') || 'Assignment not found for this user'}
                        </Text>
                    </LinearGradient>
                </View>
            </ScreenTemplate>
        );
    }

    return (
        <ScreenTemplate
            title={employeeName || (t('employeeTasks') || 'Employee Tasks')}
            headerGradient={['#FF6B9D', '#4FACFE', '#C86DD7']}
            showBackButton={true}
        >
            <View style={styles.container}>
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
                    otherEmployees={otherEmployees}
                    onMoveTask={handleMoveTask}
                />
            </View>
        </ScreenTemplate>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9ff',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    loadingCard: {
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
        minWidth: 200,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
    },
    errorCard: {
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
        maxWidth: 320,
    },
    errorText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
        lineHeight: 24,
    },
});
