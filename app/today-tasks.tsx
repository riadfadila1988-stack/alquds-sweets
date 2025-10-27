import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, I18nManager } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { useWorkDayPlan } from '@/hooks/use-work-day-plan';
import { useThemeColor } from '@/hooks/use-theme-color';
import Timer from './components/timer';
import { createNotification } from '@/services/notification';
import Header from './components/header';
import { useTranslation } from './_i18n';

// DEV logging helper
const dbg = (...args: any[]) => {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.debug('[TodayTasks]', ...args);
  }
};

export default function TodayTasksScreen() {
  const { t } = useTranslation();
  const isRTL = true;

  // intentionally using plain strings to avoid strict typed translation keys

  const { user, isLoading: authLoading } = useAuth();

  const isoDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { plan, isLoading: planLoading, error, save } = useWorkDayPlan(isoDate);

  const loading = authLoading || planLoading;

  // Local copy of assignments so UI updates instantly while saving
  const [localAssignments, setLocalAssignments] = useState<any[]>(() => plan?.assignments ? [...plan.assignments] : []);

  // Timer state (milliseconds elapsed for active task)
  const [nowMs, setNowMs] = useState<number>(Date.now());

  useEffect(() => {
    // sync local when plan changes
    setLocalAssignments(plan?.assignments ? JSON.parse(JSON.stringify(plan.assignments)) : []);
  }, [plan]);

  useEffect(() => {
    // tick every second when there is an active task
    // Only consider active tasks on the current user's assignment
    const userIdStr = String(user?._id || user);
    const hasActive = localAssignments.some((a: any) => String(a.user?._id || a.user) === userIdStr && Array.isArray(a.tasks) && a.tasks.some((t: any) => t.startTime && !t.endTime));
    if (!hasActive) return undefined;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [localAssignments, user]);

  // theme hooks and UI state must be called unconditionally (before early returns)
  const successBg = useThemeColor({}, 'success');
  const warningBg = useThemeColor({}, 'warning');
  const dangerBg = useThemeColor({}, 'danger');
  const tint = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  // Memoize assignments and tasks so hooks depending on them are stable
  const assignments = useMemo(() => localAssignments || [], [localAssignments]);
  const assignmentIndex = useMemo(() => assignments.findIndex((a: any) => String(a.user?._id || a.user) === String(user?._id)), [assignments, user]);
  const myAssignment = assignmentIndex >= 0 ? assignments[assignmentIndex] : null;
  const tasks: any[] = useMemo(() => myAssignment?.tasks || [], [myAssignment]);

  // Determine which task (by index) has an active timer, and which is the next startable task
  const activeTaskIndex = useMemo(() => tasks.findIndex((t: any) => !!t.startTime && !t.endTime), [tasks]);
  // If there is no active task, the next startable task is the first task without a startTime
  const nextStartableIndex = activeTaskIndex >= 0 ? -1 : tasks.findIndex((t: any) => !t.startTime);

  // Keep a ref to the activeTaskIndex so stable handlers can read it without being recreated
  const activeTaskIndexRef = React.useRef<number>(activeTaskIndex);
  useEffect(() => {
    activeTaskIndexRef.current = activeTaskIndex;
  }, [activeTaskIndex]);

  // Create a stable per-index onTick handler map so function identity stays stable across renders
  const onTickHandlersRef = React.useRef<Record<number, (s: number) => void>>({});
  const getOnTickHandler = (idx: number) => {
    if (!onTickHandlersRef.current[idx]) {
      onTickHandlersRef.current[idx] = (s: number) => {
        if (activeTaskIndexRef.current === idx) {
          dbg('onTick handler (stable) setActiveSecondsRemaining', { idx, s });
          setActiveSecondsRemaining(s);
        }
      };
    }
    return onTickHandlersRef.current[idx];
  };

  // Track the running task's secondsRemaining (from Timer.onTick)
  const [activeSecondsRemaining, setActiveSecondsRemaining] = useState<number | null>(null);

  // When activeTaskIndex changes, compute initial remaining seconds and set it
  useEffect(() => {
    if (activeTaskIndex >= 0) {
      const t = tasks[activeTaskIndex];
      if (t && typeof t.duration === 'number' && t.startTime) {
        const elapsedSec = Math.floor((nowMs - new Date(t.startTime).getTime()) / 1000);
        const remaining = Math.round(t.duration * 60) - elapsedSec;
        dbg('setActiveSecondsRemaining initial', { activeTaskIndex, remaining });
        setActiveSecondsRemaining(remaining);
      } else {
        setActiveSecondsRemaining(null);
      }
    } else {
      setActiveSecondsRemaining(null);
    }
  }, [activeTaskIndex, nowMs, tasks]);

  // New state for overrun modal
  const [overrunModalVisible, setOverrunModalVisible] = useState(false);
  const [overrunPending, setOverrunPending] = useState<{ taskIndex: number; endTime: Date } | null>(null);
  const [overrunReason, setOverrunReason] = useState('');

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{String(error)}</Text>
      </View>
    );
  }

  // Helpers to blend hex colors for fade effect
  const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  };
  const rgbToHex = (r: number, g: number, b: number) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const blendHex = (hexA: string, hexB: string, t: number) => {
    try {
      const A = hexToRgb(hexA);
      const B = hexToRgb(hexB);
      const r = lerp(A.r, B.r, t);
      const g = lerp(A.g, B.g, t);
      const b = lerp(A.b, B.b, t);
      return rgbToHex(r, g, b);
    } catch {
      return hexA;
    }
  };

  const getTaskBackground = (t: any, idx?: number) => {
    // if running
    if (t.startTime && !t.endTime) {
      if (typeof t.duration === 'number' && t.duration > 0) {
        // Default running bg is warning; we fade toward danger when timer is negative
        // Only use the activeSecondsRemaining for the active task; otherwise compute from this task's times
        const isActiveTask = typeof idx === 'number' && idx === activeTaskIndex;
        const remainingSecForThis = isActiveTask
          ? activeSecondsRemaining ?? Math.round(t.duration * 60 - (nowMs - new Date(t.startTime).getTime()) / 1000)
          : Math.round(t.duration * 60 - (nowMs - new Date(t.startTime).getTime()) / 1000);

        if (remainingSecForThis >= 0) return warningBg;
        const absNeg = Math.min(Math.abs(remainingSecForThis), 60 * 10); // cap fade over 10 minutes
        const ratio = Math.min(1, absNeg / (60 * 10));
        return blendHex(warningBg, dangerBg, ratio);
      }
      return warningBg; // fallback
    }
    // if finished, check actual duration
    if (t.startTime && t.endTime && typeof t.duration === 'number' && t.duration > 0) {
      const actualMin = (new Date(t.endTime).getTime() - new Date(t.startTime).getTime()) / 60000;
      if (actualMin > t.duration) return dangerBg;
      // actual <= expected => success (green)
      return successBg;
    }
    return '#fafafa';
  };

  // Helper: determine finished task status: 'success' | 'overrun' | null
  const getTaskStatus = (t: any): 'success' | 'overrun' | null => {
    if (t.startTime && t.endTime && typeof t.duration === 'number' && t.duration > 0) {
      const actualMin = (new Date(t.endTime).getTime() - new Date(t.startTime).getTime()) / 60000;
      return actualMin > t.duration ? 'overrun' : 'success';
    }
    return null;
  };

  // helper to sanitize assignments for save: ensure user is id, not populated object
  const sanitizeAssignmentsForSave = (assigns: any[]) => {
    return assigns.map(a => ({
      user: a.user?._id || a.user,
      tasks: (a.tasks || []).map((t: any) => ({ ...t })),
    }));
  };

  const persistAssignments = async (updatedAssignments: any[]) => {
    try {
      setLocalAssignments(updatedAssignments.map((a: any) => ({ ...a })));
      await save({ date: isoDate, assignments: sanitizeAssignmentsForSave(updatedAssignments) });
    } catch (e: any) {
      Alert.alert(t('failedToSaveTaskTimes'), String(e?.message || e));
    }
  };

  const endActiveTaskIfAny = (assigns: any[]) => {
    // Only end active tasks for the current user
    const userIdStr = String(user?._id || user);
    const now = new Date();
    return assigns.map((a: any) => {
      if (String(a.user?._id || a.user) !== userIdStr) return a;
      return {
        ...a,
        tasks: (a.tasks || []).map((t: any) => {
          if (t.startTime && !t.endTime) {
            return { ...t, endTime: now };
          }
          return t;
        }),
      };
    });
  };

  const handleStart = async (taskIndex: number) => {
    if (!myAssignment) return;
    const now = new Date();
    let updated = JSON.parse(JSON.stringify(assignments));

    // If there is another active task, end it first
    updated = endActiveTaskIfAny(updated);

    // set startTime for the selected task and clear endTime
    updated = updated.map((a: any, ai: number) => {
      if (ai !== assignmentIndex) return a;
      const tasksCopy = (a.tasks || []).map((t: any, ti: number) => {
        if (ti === taskIndex) {
          return { ...t, startTime: now, endTime: t.endTime ? t.endTime : null };
        }
        return t;
      });
      return { ...a, tasks: tasksCopy };
    });

    // update local state + persist; set now immediately so timer shows 00:00:00
    const p = persistAssignments(updated);
    setNowMs(Date.now());
    await p;
  };

  const handleEnd = async (taskIndex: number) => {
    if (!myAssignment) return;
    const now = new Date();

    // Check if the task overran its planned duration; if so, open modal to collect reason
    const t = tasks[taskIndex];
    if (t && t.startTime && typeof t.duration === 'number' && t.duration > 0) {
      const actualMin = (now.getTime() - new Date(t.startTime).getTime()) / 60000;
      if (actualMin > t.duration) {
        // Show modal and defer ending until user provides a reason
        setOverrunPending({ taskIndex, endTime: now });
        setOverrunReason('');
        setOverrunModalVisible(true);
        return;
      }
    }

    const updated = assignments.map((a: any, ai: number) => {
      if (ai !== assignmentIndex) return a;
      const tasksCopy = (a.tasks || []).map((t: any, ti: number) => {
        if (ti === taskIndex) {
          return { ...t, endTime: now };
        }
        return t;
      });
      return { ...a, tasks: tasksCopy };
    });

    await persistAssignments(updated);
  };

  const saveOverrunAndClose = async () => {
    if (!overrunPending) return;
    const { taskIndex, endTime } = overrunPending;

    // attach endTime and overrunReason to the specific task
    const updated = assignments.map((a: any, ai: number) => {
      if (ai !== assignmentIndex) return a;
      const tasksCopy = (a.tasks || []).map((t: any, ti: number) => {
        if (ti === taskIndex) {
          return { ...t, endTime, overrunReason: overrunReason.trim() || undefined };
        }
        return t;
      });
      return { ...a, tasks: tasksCopy };
    });

    setOverrunModalVisible(false);
    setOverrunPending(null);

    await persistAssignments(updated);

    // Send a notification for the overrun to admins: include employee name, task name, overtime and reason
    try {
      const ass = (updated && updated[assignmentIndex]) || assignments[assignmentIndex] || null;
      const empName = ass?.user?.name || String(ass?.user || 'Unknown employee');
      const t = ass?.tasks?.[taskIndex] || null;
      const taskName = t?.name || 'Untitled Task';
      const plannedMin = typeof t?.duration === 'number' ? t.duration : 0;
      const actualMin = t?.endTime && t?.startTime ? Math.round((new Date(t.endTime).getTime() - new Date(t.startTime).getTime()) / 60000) : null;
      const overtimeMin = actualMin !== null ? Math.max(0, Math.round(actualMin - plannedMin)) : null;
      const reasonText = overrunReason?.trim() || 'No reason provided';

      // Build Arabic overtime text
      let overtimeTextAr: string;
      if (overtimeMin === null) {
        overtimeTextAr = 'بعض الوقت الإضافي';
      } else if (overtimeMin === 1) {
        overtimeTextAr = 'دقيقة واحدة';
      } else {
        overtimeTextAr = `${overtimeMin} دقيقة`;
      }

      dbg('creating overrun notification (AR)', { empName, taskName, overtimeMin, reasonText });
      const messageAr = `${empName} — "${taskName}" استغرق ${overtimeTextAr} أكثر. السبب: ${reasonText}`;
      await createNotification(messageAr);
      // In development, notify the user that the notification was sent (helps debug missing server-side creation)
      try {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          Alert.alert(t('notifications'), t('notificationSent'));
        }
      } catch {}
      dbg('sent overrun notification (AR)', { empName, taskName, overtimeMin, reasonText });
    } catch (e: any) {
      // Surface failure to the user in dev so it's obvious why admins wouldn't see it
      try {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          Alert.alert(t('notificationFailed'), String(e?.message || e));
        }
      } catch {}
      dbg('failed to send overrun notification', e?.message || e);
    } finally {
      // clear the reason input in the UI
      setOverrunReason('');
    }
  };

  const cancelOverrun = () => {
    // Close modal and do not end the task; user can tap End again later
    setOverrunModalVisible(false);
    setOverrunPending(null);
    setOverrunReason('');
  };

  const formatElapsed = (start: string | Date | undefined) => {
    if (!start) return '00:00:00';
    const s = new Date(start).getTime();
    const diff = Math.max(0, nowMs - s);
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <View style={styles.screen}>
      <Header title={t('todayTasks')} />
      <ScrollView contentContainerStyle={styles.container}>
        {tasks.length === 0 ? (
          <Text style={[styles.empty, { textAlign: isRTL ? 'right' : 'left' }]}>{t('noTasksToday')}</Text>
        ) : (
          tasks.map((task: any, idx: number) => {
            const isRunning = !!task.startTime && !task.endTime;
            const isFinished = !!task.startTime && !!task.endTime;
            const bg = getTaskBackground(task, idx);
            const status = getTaskStatus(task);

            // Decide which action button to show:
            // - If there is an active task, only that task (activeTaskIndex) shows the End button.
            // - If there is no active task, only the nextStartableIndex shows the Start button.
            const showEnd = idx === activeTaskIndex;
            const showStart = idx === nextStartableIndex;

            return (
              <View key={task._id ?? idx} style={[styles.card, { backgroundColor: bg }]}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.taskName, { textAlign: isRTL ? 'right' : 'left' }]}>{task.name || t('untitledTask')}</Text>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                    <Text style={[styles.meta, { textAlign: isRTL ? 'right' : 'left' }]}>{task.duration ? `${task.duration}m` : ''}</Text>
                    {status === 'success' ? (
                      <Text style={[styles.badge, { backgroundColor: successBg, marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0, color: textColor }]}>{'✓'}</Text>
                    ) : status === 'overrun' ? (
                      <Text style={[styles.badge, { backgroundColor: dangerBg, marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0, color: textColor }]}>{'⚠️'}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Show the Timer for the running task; otherwise show elapsed time */}
                {isRunning ? (
                  (() => {
                    return (
                      <Timer
                        // pass the task's full duration and startedAt so Timer computes remaining
                        // internally — this avoids passing a per-second changing `minutes` prop
                        minutes={typeof task.duration === 'number' ? task.duration : 0}
                        startedAt={task.startTime}
                        resetKey={String(task.startTime)}
                        onTick={getOnTickHandler(idx)}
                      />
                    );
                  })()
                ) : (
                  <Text style={[styles.meta, { textAlign: isRTL ? 'right' : 'left' }]}>{`${t('elapsed')}: `}{isFinished ? formatElapsed(task.startTime) : '00:00:00'}</Text>
                )}

                {task.description ? <Text style={styles.description}>{task.description}</Text> : null}

                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 8, justifyContent: 'flex-end' }}>
                  {showStart ? (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: tint }]} onPress={() => handleStart(idx)}>
                      <Text style={{ color: 'white' }}>{t('start')}</Text>
                    </TouchableOpacity>
                  ) : showEnd ? (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: dangerBg }]} onPress={() => handleEnd(idx)}>
                      <Text style={{ color: 'white' }}>{t('end')}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })
        )}

        {/* Overrun modal */}
        <Modal
          visible={overrunModalVisible}
          transparent
          animationType="fade"
          onRequestClose={cancelOverrun}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalInner}>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>{t('overrunTitle')}</Text>
                  <Text style={styles.modalText}>{t('overrunPrompt')}</Text>
                  <TextInput
                    value={overrunReason}
                    onChangeText={setOverrunReason}
                    placeholder={t('overrunPlaceholder')}
                    style={styles.modalInput}
                    multiline
                    numberOfLines={3}
                  />
                  <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TouchableOpacity style={[styles.actionBtn, { marginRight: 8 }]} onPress={cancelOverrun}>
                      <Text style={{ color: 'white' }}>{t('cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: tint }]}
                      onPress={saveOverrunAndClose}
                      disabled={!overrunReason.trim()}
                    >
                      <Text style={{ color: 'white' }}>{t('save')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  empty: { textAlign: 'center', color: '#666' },
  card: { backgroundColor: '#fafafa', padding: 12, borderRadius: 8, marginBottom: 10 },
  taskName: { fontSize: 16, fontWeight: '600' },
  meta: { color: '#555', marginTop: 4 },
  description: { marginTop: 6, color: '#333' },
  materialItem: { color: '#444' },
  error: { color: '#a00' },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  badge: { fontSize: 16, padding: 4, borderRadius: 12, color: 'white' },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalInner: { flex: 1, justifyContent: 'center' },
  modalCard: { backgroundColor: 'white', borderRadius: 8, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalText: { color: '#444', marginBottom: 8 },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 8, minHeight: 60, textAlignVertical: 'top', marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  screen: { flex: 1, backgroundColor: '#fff' },
});
