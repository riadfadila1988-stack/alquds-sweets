import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import Header from './components/header';
import { useWorkDayPlan } from '@/hooks/use-work-day-plan';
import { getHistory as getAttendanceHistory } from '@/services/employee-attendance';
import { WorkSession } from '@/hooks/use-working-hours';
import { useAuth } from '@/hooks/use-auth';
import { getUsers } from '@/services/user';
import { useTranslation } from './_i18n';
import { useThemeColor } from '@/hooks/use-theme-color';
import Timer from './components/timer';
import { IconSymbol } from '@/components/ui/icon-symbol';

function formatDurationMinutes(minutes: number | undefined) {
  if (minutes == null || isNaN(minutes)) return '--';
  const m = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  return `${hours}h ${mins}m`;
}

// Helper: normalize common task fields to support different backend shapes
function getTaskStart(task: any): Date | null {
  if (!task) return null;
  const possible = [task.startTime];
  for (const p of possible) {
    if (p == null) continue;
    // If it's a number (ms or s), try to normalize
    if (typeof p === 'number') {
      // If likely seconds (less than 1e12), convert seconds -> ms
      const maybeMs = p > 1e12 ? p : p > 1e10 ? p : p > 1e9 ? p * 1000 : p * 1000;
      const d = new Date(maybeMs);
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date(p);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function getTaskEnd(task: any): Date | null {
  if (!task) return null;
  const possible = [task.endTime];
  for (const p of possible) {
    if (p == null) continue;
    if (typeof p === 'number') {
      const maybeMs = p > 1e12 ? p : p > 1e10 ? p : p > 1e9 ? p * 1000 : p * 1000;
      const d = new Date(maybeMs);
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date(p);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function getTaskDurationMinutes(task: any): number | null {
  if (!task) return null;
  const possibleDur = ['duration', 'durationInMinutes', 'duration_minutes', 'estimatedDuration', 'estimated_duration', 'durationSeconds', 'duration_in_seconds', 'duration_seconds'];
  for (const key of possibleDur) {
    if (task[key] != null) {
      const v = task[key];
      if (typeof v === 'number') {
        // if value looks like seconds (large), convert to minutes
        if (v > 1440) {
          // probably seconds -> minutes
          return Math.round(v / 60);
        }
        return Math.round(v);
      }
      const parsed = parseFloat(v);
      if (!isNaN(parsed)) return Math.round(parsed);
    }
  }
  // fallback: some tasks might have nested time ranges or durations elsewhere
  return null;
}

export default function WorkStatusScreen() {
  const { t } = useTranslation();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  // RTL is always true per app configuration
  const isRTL = true;
  const rtlText: any = { textAlign: 'right', writingDirection: 'rtl' };

  // theme colors used to compute task card backgrounds/badges (similar to TodayTasks screen)
  const successBg = useThemeColor({}, 'success');
  const warningBg = useThemeColor({}, 'warning');
  const dangerBg = useThemeColor({}, 'danger');

  // Server expects a date that maps to the stored WorkDayPlan date (date-only)
  // Pass YYYY-MM-DD (no time) to avoid exact timestamp mismatch when querying by Date equality.
  const todayDateOnly = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { plan, isLoading, error, refetch } = useWorkDayPlan(todayDateOnly);
  // user not needed in this screen
  useAuth();

  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [currentSessionsMap, setCurrentSessionsMap] = useState<Record<string, WorkSession | null>>({});
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  // selected employee id for expanded view
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // helper: normalize user object/string -> employee id (string) or null
  function getEmployeeIdFromUser(u: any): string | null {
    if (!u) return null;
    if (typeof u === 'string') return u;
    if (typeof u === 'object') {
      if (u._id) return String(u._id);
      if (u.id) return String(u.id);
    }
    return null;
  }

  // helper: collect tasks assigned to an employee from the plan
  function getTasksForEmployee(empId: string | null) {
    if (!empId || !plan || !Array.isArray(plan.assignments)) return [];
    const tasks: any[] = [];
    for (const assignment of plan.assignments) {
      let id: any = null;
      if (assignment.user) {
        if (typeof assignment.user === 'string') id = assignment.user;
        else id = assignment.user._id || assignment.user.id;
      } else if ((assignment as any).userId) {
        id = (assignment as any).userId;
      }

      if (id != null && String(id) === String(empId)) {
        const tks = Array.isArray(assignment.tasks) ? assignment.tasks : [];
        for (const tk of tks) tasks.push(tk);
      }
    }
    return tasks;
  }

  // Background and status helpers (adapted from TodayTasks). Keep simple here.
  function getTaskBackground(task: any) {
    if (!task) return '#fafafa';
    // running
    if (getTaskStart(task) && !getTaskEnd(task)) return warningBg;
    // finished
    if (getTaskStart(task) && getTaskEnd(task) && typeof task.duration === 'number' && task.duration > 0) {
      const actualMin = (new Date(getTaskEnd(task) as Date).getTime() - new Date(getTaskStart(task) as Date).getTime()) / 60000;
      return actualMin > task.duration ? dangerBg : successBg;
    }
    return '#fafafa';
  }

  function getTaskStatus(task: any): 'success' | 'overrun' | null {
    if (getTaskStart(task) && getTaskEnd(task) && typeof task.duration === 'number' && task.duration > 0) {
      const actualMin = (new Date(getTaskEnd(task) as Date).getTime() - new Date(getTaskStart(task) as Date).getTime()) / 60000;
      return actualMin > task.duration ? 'overrun' : 'success';
    }
    return null;
  }

  const loadAttendance = useCallback(async () => {
    try {
      setAttendanceLoading(true);
      const data = await getAttendanceHistory();
      // data.records expected to be WorkSession[] (see hook)
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const todays = (data.records || []).filter((s: WorkSession) => {
        const dt = new Date(s.clockIn);
        return dt >= startOfDay && dt < endOfDay;
      });

      const map: Record<string, WorkSession | null> = {};
      for (const s of todays) {
        if (!s.clockOut) {
          map[s.employeeId] = s;
        }
      }
      setCurrentSessionsMap(map);

      // Also trigger a refetch of the day's plan so task list reflects updates on the server
      try {
        if (typeof refetch === 'function') await refetch();
      } catch (e) {
        // non-fatal
        console.warn('Failed to refetch work day plan', e);
      }
    } catch (e) {
      console.warn('Failed to load attendance', e);
    } finally {
      setAttendanceLoading(false);
    }
  }, [refetch]);

  useEffect(() => {
    // Load attendance when the component mounts and when plan changes
    loadAttendance();
    // Load users (to map employeeId -> name)
    (async () => {
      try {
        const users = await getUsers();
        const map: Record<string, any> = {};
        for (const u of users) map[u._id] = u;
        setUsersMap(map);
      } catch (e) {
        console.warn('Failed to load users', e);
      }
    })();
    const id = setInterval(loadAttendance, 60000); // refresh every minute
    return () => clearInterval(id);
  }, [loadAttendance]);

  // trigger re-render every 30s to update elapsed times
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  if (isLoading || attendanceLoading) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <ActivityIndicator size="large" color="#888" />
      </View>
    );
  }

  // Build a list of employees from the plan's assignments only.
  // We will NOT include employees who are not part of the plan (even if they have an open attendance session).
  const activeEntries: any[] = [];

  // Only iterate assignments from today's plan. For each assigned employee, gather their
  // tasks and detect if they are currently working (active task or open attendance session).
  if (plan && Array.isArray(plan.assignments)) {
    for (const assignment of plan.assignments) {
      let empId: string | null = null;
      let userObj: any = null;
      if (assignment.user) {
        if (typeof assignment.user === 'string') empId = assignment.user;
        else empId = assignment.user._id || assignment.user.id || null;
        userObj = assignment.user;
      } else if ((assignment as any).userId) {
        empId = (assignment as any).userId;
      }
      if (!empId) continue;

      const idStr = String(empId);
      const tasks = getTasksForEmployee(idStr);
      const activeTask = tasks.find((tk: any) => getTaskStart(tk) && !getTaskEnd(tk));

      let start: Date | undefined = undefined;
      let elapsedMinutes: number | undefined = undefined;
      let assignedDuration: number | undefined = undefined;
      let taskForView: any = null;

      if (activeTask) {
        start = getTaskStart(activeTask) as Date;
        if (start) elapsedMinutes = Math.floor((Date.now() - start.getTime()) / 60000);
        assignedDuration = getTaskDurationMinutes(activeTask) ?? undefined;
        taskForView = activeTask;
      } else {
        // If the employee has an open attendance session, consider them working even if no task started.
        const session = currentSessionsMap[idStr];
        if (session && session.clockIn && !session.clockOut) {
          start = new Date(session.clockIn);
          elapsedMinutes = Math.floor((Date.now() - start.getTime()) / 60000);
          taskForView = null;
        }
      }

      const isWorking = !!start;

      activeEntries.push({
        user: userObj || usersMap[idStr] || idStr,
        empId: idStr,
        task: taskForView,
        tasksAll: tasks,
        start,
        elapsedMinutes,
        assignedDuration,
        simpleView: !isWorking,
      });
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor }]}>
      <Header title={t('workStatus') || 'Work Status'} />

      {error ? (
        <Text style={[styles.error, { color: textColor }]}>{error}</Text>
      ) : null}

      {activeEntries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: textColor }]}>{t('noOneWorking') || 'No employees are currently working on tasks.'}</Text>
        </View>
      ) : (
        activeEntries.map((e, idx) => {
          // compute overrun only when numeric durations exist
          const overrun = typeof e.assignedDuration === 'number' && e.assignedDuration > 0 && typeof e.elapsedMinutes === 'number' && e.elapsedMinutes > e.assignedDuration;
          const cardBg = overrun ? '#FFCDD2' : '#FFF9C4'; // red-ish vs yellow-ish
          const empId = getEmployeeIdFromUser(e.user);

          return (
            <View key={idx}>
              <Pressable
                onPress={() => {
                  // toggle selected employee
                  if (!empId) return setSelectedEmployeeId(null);
                  setSelectedEmployeeId(prev => (prev === empId ? null : empId));
                }}
              >
                <View style={[styles.card, { backgroundColor: cardBg }]}>
                  <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.employeeName, rtlText]}>{e.user?.name || e.user?.fullName || e.user || 'Unknown'}</Text>
                    {/* When simpleView is set, we intentionally do not show task name/details */}
                    {!e.simpleView ? <Text style={[styles.taskNameSmall, rtlText]}>{e.task?.name || 'Task'}</Text> : null}
                  </View>

                  {/* If this is a simple view entry (no tasks or show name-only), skip task details */}
                  {!e.simpleView ? (
                    <>
                      <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.label, rtlText]}>{t('startedAt') || 'Started at'}:</Text>
                        <Text style={[styles.value, { color: textColor }, rtlText]}>{e.start ? e.start.toLocaleTimeString() : '--'}</Text>
                      </View>

                      <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.label, rtlText]}>{t('assignedDuration') || 'Assigned duration'}:</Text>
                        <Text style={[styles.value, { color: textColor }, rtlText]}>{formatDurationMinutes(e.assignedDuration)}</Text>
                      </View>

                      <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={{ flexDirection:  'row' , alignItems: 'center', gap: '5' }}>
                          <Text style={[styles.value, { color: textColor }, rtlText]}>{formatDurationMinutes(e.elapsedMinutes)}</Text>
                          <IconSymbol name="clock" size={16} color={textColor} style={{ marginEnd: 8 }} />
                        </View>
                      </View>
                    </>
                  ) : null}
                </View>
              </Pressable>

              {/* Expanded tasks list for this employee when selected */}
              {selectedEmployeeId && empId && selectedEmployeeId === empId ? (
                <View style={styles.taskList}>
                  <Text style={[styles.taskListTitle, { color: textColor }, rtlText]}>{t('todayTasks') || "Today's tasks"}</Text>
                  {getTasksForEmployee(empId).length === 0 ? (
                    <Text style={[styles.emptyText, { color: textColor }, rtlText]}>{t('noTasksToday') || 'No tasks found for today.'}</Text>
                  ) : (
                     (() => {
                       // Filter out the currently running task (start exists and end is missing)
                       const all = getTasksForEmployee(empId);
                       const visible = all.filter((task: any) => !(getTaskStart(task) && !getTaskEnd(task)));
                       if (visible.length === 0) {
                         return <Text style={[styles.emptyText, { color: textColor }, rtlText]}>{t('noTasksToday') || 'No tasks found for today.'}</Text>;
                       }
                       return visible.map((task: any, i: number) => {
                        const isRunning = !!getTaskStart(task) && !getTaskEnd(task);
                        const bg = getTaskBackground(task);
                        const status = getTaskStatus(task);

                         // Compute actual duration from task start/end timestamps (end - start)
                         const taskStartDt = getTaskStart(task);
                         const taskEndDt = getTaskEnd(task);
                         const actualDurationMinutes = taskStartDt && taskEndDt ? Math.floor((taskEndDt.getTime() - taskStartDt.getTime()) / 60000) : undefined;

                         return (
                           <View key={task._id ?? i} style={[styles.card, { backgroundColor: bg }]}>
                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={[styles.taskName, { color: textColor }, rtlText]}>{task.name || 'Untitled Task'}</Text>
                              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                                <Text style={[styles.meta, { color: textColor }, rtlText]}>{task.duration ? `${task.duration}m` : ''}</Text>
                                {status === 'success' ? (
                                  <Text style={[styles.badge, { backgroundColor: successBg, marginStart: 8, color: textColor }]}>{'✓'}</Text>
                                ) : status === 'overrun' ? (
                                  <Text style={[styles.badge, { backgroundColor: dangerBg, marginStart: 8, color: textColor }]}>{'⚠️'}</Text>
                                ) : null}
                              </View>
                            </View>

                             {/* Show Timer for running tasks; otherwise show elapsed time */}
                             {isRunning ? (
                               <Timer
                                 minutes={typeof task.duration === 'number' ? task.duration : 0}
                                 startedAt={getTaskStart(task)}
                                 resetKey={String(getTaskStart(task))}
                               />
                             ) : (
                              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                                <IconSymbol name="clock.fill" size={14} color={textColor} style={{ marginEnd: 8 }} />
                                {/* Show actual elapsed time computed from endTime - startTime when available */}
                                <Text style={[styles.meta, { color: textColor }, rtlText]}>{typeof actualDurationMinutes === 'number' ? formatDurationMinutes(actualDurationMinutes) : '00:00'}</Text>
                              </View>
                             )}

                            {task.description ? <Text style={[styles.description, { color: textColor }, rtlText]}>{task.description}</Text> : null}

                             {/* No action buttons here — this is view-only */}
                           </View>
                         );
                       });
                     })()
                    )}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    );
  }

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  card: { padding: 14, borderRadius: 10, marginBottom: 12, elevation: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  employeeName: { fontSize: 16, fontWeight: '700' },
  taskName: { fontSize: 16, fontWeight: '600' },
  taskNameSmall: { fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  label: { fontSize: 13, opacity: 0.8 },
  value: { fontSize: 13, fontWeight: '600' },
  emptyContainer: { padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 16, opacity: 0.8 },
  error: { color: '#b00020', textAlign: 'center', marginBottom: 10 },
  taskList: { padding: 12, backgroundColor: '#ffffff', borderRadius: 8, marginBottom: 12 },
  taskListTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  taskRow: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8, marginTop: 8 },
  taskMeta: { fontSize: 12, opacity: 0.8, marginTop: 4 },
  // Styles matching TodayTasks screen for task cards
  meta: { color: '#555', marginTop: 4 },
  description: { marginTop: 6, color: '#333' },
  badge: { fontSize: 16, padding: 4, borderRadius: 12, color: 'white' },
});
