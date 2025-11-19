import React, {useEffect, useMemo, useState, useCallback, useRef} from 'react';
import {View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Animated, Easing} from 'react-native';
import {ScreenTemplate} from '@/components/ScreenTemplate';
import {useLocalSearchParams} from 'expo-router';
import {useWorkDayPlan} from '@/hooks/use-work-day-plan';
import {getHistory as getAttendanceHistory} from '@/services/employee-attendance';
import {WorkSession} from '@/hooks/use-working-hours';
import {useAuth} from '@/hooks/use-auth';
import {getUsers} from '@/services/user';
import {useTranslation} from './_i18n';
import {useThemeColor} from '@/hooks/use-theme-color';
import Timer from './components/timer';
import {IconSymbol} from '@/components/ui/icon-symbol';
import {LinearGradient} from 'expo-linear-gradient';

function formatDurationMinutes(minutes: number | undefined) {
    if (minutes == null || isNaN(minutes)) return '--';
    const m = Math.max(0, Math.floor(minutes));
    const hours = Math.floor(m / 60);
    const mins = m % 60;
    return `${hours}h ${mins}m`;
}

// 🎉 FUN CONFETTI COMPONENT 🎉
const ConfettiPiece = ({delay}: { delay: number }) => {
    const animValue = useRef(new Animated.Value(0)).current;
    const rotateValue = useRef(new Animated.Value(0)).current;
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const leftPos = Math.random() * 100;

    useEffect(() => {
        Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(animValue, {
                        toValue: 1,
                        duration: 3000 + Math.random() * 2000,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.timing(rotateValue, {
                    toValue: 1,
                    duration: 1000 + Math.random() * 1000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [delay]);

    const translateY = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [-20, 600],
    });

    const rotate = rotateValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <Animated.View
            style={{
                position: 'absolute',
                left: `${leftPos}%`,
                width: 10,
                height: 10,
                backgroundColor: color,
                transform: [{translateY}, {rotate}],
                opacity: animValue.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 1, 0],
                }),
            }}
        />
    );
};

// 🌟 ANIMATED CARD COMPONENT 🌟
const AnimatedCard = ({children, delay, onPress}: {
    children: React.ReactNode;
    delay: number;
    onPress?: () => void
}) => {
    const scaleValue = useRef(new Animated.Value(0)).current;
    const bounceValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(scaleValue, {
            toValue: 1,
            delay,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
        }).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(bounceValue, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(bounceValue, {
                    toValue: 0,
                    duration: 2000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [delay]);

    const translateY = bounceValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -5],
    });

    return (
        <Animated.View style={{transform: [{scale: scaleValue}, {translateY}]}}>
            <Pressable onPress={onPress}>{children}</Pressable>
        </Animated.View>
    );
};

// 💫 SPARKLE EFFECT 💫
const Sparkle = ({size = 20}: { size?: number }) => {
    const sparkleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(sparkleAnim, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(sparkleAnim, {
                    toValue: 0,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const scale = sparkleAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.5, 1.2, 0.5],
    });

    return (
        <Animated.Text style={{fontSize: size, transform: [{scale}]}}>
            ✨
        </Animated.Text>
    );
};

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
    const {t} = useTranslation();
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const params = useLocalSearchParams();
    const headerColor1 = (params as any)?.headerColor1 as string | undefined;
    const headerColor2 = (params as any)?.headerColor2 as string | undefined;
    // Header gradient colors (align with action/button style for this screen: green)
    const grad1 = headerColor1 || '#02632D';
    const grad2 = headerColor2 || '#06A34E';
    const grad3 = '#048B3D';

    // RTL is always true per app configuration
    const isRTL = true;
    const rtlText: any = {textAlign: 'right', writingDirection: 'rtl'};

    // theme colors used to compute task card backgrounds/badges (similar to TodayTasks screen)
    const successBg = useThemeColor({}, 'success');
    const warningBg = useThemeColor({}, 'warning');
    const dangerBg = useThemeColor({}, 'danger');

    // Server expects a date that maps to the stored WorkDayPlan date (date-only)
    // Pass YYYY-MM-DD (no time) to avoid exact timestamp mismatch when querying by Date equality.
    const todayDateOnly = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const {plan, isLoading, error, refetch} = useWorkDayPlan(todayDateOnly);
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

    // 🎯 FUN EMOJI STATUS HELPERS 🎯
    function getStatusEmoji(isWorking: boolean, overrun: boolean) {
        if (overrun) return '⚡';
        if (isWorking) return '🔥';
        return '✅';
    }

    function getRandomWorkEmoji() {
        const emojis = ['💪', '🚀', '⭐', '🎯', '🌟', '💎', '🏆', '👑'];
        return emojis[Math.floor(Math.random() * emojis.length)];
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
            <ScreenTemplate title={t('workStatus') || '🌟 Work Status 🌟'} showBackButton={true}
                            headerGradient={[grad1, grad2, grad3] as any}>
                <View style={[styles.container, {backgroundColor, alignItems: 'center', justifyContent: 'center'}]}>
                    <Sparkle size={40}/>
                    <ActivityIndicator size="large" color={grad2} style={{marginVertical: 20}}/>
                    <Text style={{color: textColor, fontSize: 18, fontWeight: '600'}}>✨ Loading magic... ✨</Text>
                    {[...Array(5)].map((_, i) => (
                        <ConfettiPiece key={i} delay={i * 200}/>
                    ))}
                </View>
            </ScreenTemplate>
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
        <ScreenTemplate title={t('workStatus') || '🎉 Work Status 🎉'} showBackButton={true}
                        headerGradient={[grad1, grad2, grad3] as any}>
            <View style={{position: 'relative', flex: 1}}>
                {/* 🎊 CONFETTI BACKGROUND 🎊 */}
                {[...Array(15)].map((_, i) => (
                    <ConfettiPiece key={i} delay={i * 300}/>
                ))}

                <ScrollView style={[styles.container, {backgroundColor}]}>
                    {error ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorEmoji}>😢</Text>
                            <Text style={[styles.error, {color: textColor}]}>{error}</Text>
                        </View>
                    ) : null}

                    {activeEntries.length === 0 ? (
                        <AnimatedCard delay={100} onPress={undefined}>
                            <LinearGradient
                                colors={['#E3F2FD', '#BBDEFB', '#90CAF9']}
                                style={styles.emptyContainer}
                                start={{x: 0, y: 0}}
                                end={{x: 1, y: 1}}
                            >
                                <Sparkle size={50}/>
                                <Text style={[styles.emptyText, {color: textColor, fontSize: 18, marginTop: 10}]}>
                                    {t('noOneWorking') || '🌴 No employees are currently working on tasks.'}
                                </Text>
                                <Text style={{fontSize: 40, marginTop: 10}}>☕</Text>
                            </LinearGradient>
                        </AnimatedCard>
                    ) : (
                        <>
                            {/* 🏆 FUN HEADER 🏆 */}
                            <AnimatedCard delay={0} onPress={undefined}>
                                <LinearGradient
                                    colors={[grad1, grad2, grad3]}
                                    style={styles.funHeader}
                                    start={{x: 0, y: 0}}
                                    end={{x: 1, y: 1}}
                                >
                                    <Sparkle size={30}/>
                                    <Text style={styles.funHeaderText}>
                                        🚀 {activeEntries.filter(e => !e.simpleView).length} Rockstars Working! 🚀
                                    </Text>
                                    <Sparkle size={30}/>
                                </LinearGradient>
                            </AnimatedCard>

                            {activeEntries.map((e, idx) => {
                                const overrun = typeof e.assignedDuration === 'number' && e.assignedDuration > 0 && typeof e.elapsedMinutes === 'number' && e.elapsedMinutes > e.assignedDuration;
                                const isWorking = !e.simpleView;
                                const empId = getEmployeeIdFromUser(e.user);
                                const statusEmoji = getStatusEmoji(isWorking, overrun);
                                const randomEmoji = getRandomWorkEmoji();

                                // Fun gradient colors based on status
                                const cardColors = overrun
                                    ? ['#FFCDD2', '#EF9A9A', '#E57373'] as const
                                    : isWorking
                                        ? ['#FFF9C4', '#FFF59D', '#FFF176'] as const
                                        : ['#C8E6C9', '#A5D6A7', '#81C784'] as const;

                                return (
                                    <View key={idx}>
                                        <AnimatedCard delay={idx * 100} onPress={() => {
                                            if (!empId) return setSelectedEmployeeId(null);
                                            setSelectedEmployeeId(prev => (prev === empId ? null : empId));
                                        }}>
                                            <LinearGradient
                                                colors={cardColors}
                                                style={styles.card}
                                                start={{x: 0, y: 0}}
                                                end={{x: 1, y: 1}}
                                            >
                                                <View
                                                    style={[styles.header, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}>
                                                    <View style={{
                                                        flexDirection: isRTL ? 'row-reverse' : 'row',
                                                        alignItems: 'center'
                                                    }}>
                                                        <Text style={{fontSize: 24, marginEnd: 8}}>{statusEmoji}</Text>
                                                        <Text
                                                            style={[styles.employeeName, rtlText]}>{e.user?.name || e.user?.fullName || e.user || 'Unknown'}</Text>
                                                        {isWorking && <Text
                                                            style={{fontSize: 20, marginStart: 8}}>{randomEmoji}</Text>}
                                                    </View>
                                                    {!e.simpleView ? (
                                                        <View style={{
                                                            flexDirection: isRTL ? 'row-reverse' : 'row',
                                                            alignItems: 'center'
                                                        }}>
                                                            <Sparkle size={16}/>
                                                            <Text
                                                                style={[styles.taskNameSmall, rtlText, {marginHorizontal: 4}]}>{e.task?.name || 'Task'}</Text>
                                                        </View>
                                                    ) : null}
                                                </View>

                                                {!e.simpleView ? (
                                                    <>
                                                        <View
                                                            style={[styles.row, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}>
                                                            <Text
                                                                style={[styles.label, rtlText]}>⏰ {t('startedAt') || 'Started at'}:</Text>
                                                            <Text
                                                                style={[styles.value, {color: textColor}, rtlText]}>{e.start ? e.start.toLocaleTimeString() : '--'}</Text>
                                                        </View>

                                                        <View
                                                            style={[styles.row, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}>
                                                            <Text
                                                                style={[styles.label, rtlText]}>📊 {t('assignedDuration') || 'Assigned duration'}:</Text>
                                                            <Text
                                                                style={[styles.value, {color: textColor}, rtlText]}>{formatDurationMinutes(e.assignedDuration)}</Text>
                                                        </View>

                                                        <View style={[styles.row, {
                                                            flexDirection: isRTL ? 'row-reverse' : 'row',
                                                            alignItems: 'center'
                                                        }]}>
                                                            <View style={{
                                                                flexDirection: isRTL ? 'row-reverse' : 'row',
                                                                alignItems: 'center',
                                                                gap: 5
                                                            }}>
                                                                <IconSymbol name="clock" size={18} color={textColor}/>
                                                                <Text style={[styles.value, {
                                                                    color: textColor,
                                                                    fontSize: 16,
                                                                    fontWeight: '700'
                                                                }, rtlText]}>
                                                                    {formatDurationMinutes(e.elapsedMinutes)}
                                                                </Text>
                                                                {overrun && <Text style={{fontSize: 20}}>⚡</Text>}
                                                            </View>
                                                        </View>
                                                    </>
                                                ) : null}
                                            </LinearGradient>
                                        </AnimatedCard>

                                        {/* Expanded tasks list for this employee when selected */}
                                        {selectedEmployeeId && empId && selectedEmployeeId === empId ? (
                                            <AnimatedCard delay={50} onPress={undefined}>
                                                <LinearGradient
                                                    colors={['#E8EAF6', '#C5CAE9', '#9FA8DA']}
                                                    style={styles.taskList}
                                                    start={{x: 0, y: 0}}
                                                    end={{x: 1, y: 1}}
                                                >
                                                    <View style={{
                                                        flexDirection: isRTL ? 'row-reverse' : 'row',
                                                        alignItems: 'center',
                                                        marginBottom: 12
                                                    }}>
                                                        <Text style={{fontSize: 24}}>📋</Text>
                                                        <Text style={[styles.taskListTitle, {
                                                            color: textColor,
                                                            marginHorizontal: 8
                                                        }, rtlText]}>
                                                            {t('todayTasks') || "Today's tasks"}
                                                        </Text>
                                                        <Sparkle size={18}/>
                                                    </View>

                                                    {getTasksForEmployee(empId).length === 0 ? (
                                                        <View style={{alignItems: 'center', padding: 20}}>
                                                            <Text style={{fontSize: 40}}>🎯</Text>
                                                            <Text style={[styles.emptyText, {
                                                                color: textColor,
                                                                marginTop: 10
                                                            }, rtlText]}>
                                                                {t('noTasksToday') || 'No tasks found for today.'}
                                                            </Text>
                                                        </View>
                                                    ) : (
                                                        (() => {
                                                            const all = getTasksForEmployee(empId);
                                                            const visible = all.filter((task: any) => !(getTaskStart(task) && !getTaskEnd(task)));
                                                            if (visible.length === 0) {
                                                                return (
                                                                    <View style={{alignItems: 'center', padding: 20}}>
                                                                        <Text style={{fontSize: 40}}>🎯</Text>
                                                                        <Text style={[styles.emptyText, {
                                                                            color: textColor,
                                                                            marginTop: 10
                                                                        }, rtlText]}>
                                                                            {t('noTasksToday') || 'No tasks found for today.'}
                                                                        </Text>
                                                                    </View>
                                                                );
                                                            }
                                                            return visible.map((task: any, i: number) => {
                                                                const isRunning = !!getTaskStart(task) && !getTaskEnd(task);
                                                                const status = getTaskStatus(task);
                                                                const taskStartDt = getTaskStart(task);
                                                                const taskEndDt = getTaskEnd(task);
                                                                const actualDurationMinutes = taskStartDt && taskEndDt ? Math.floor((taskEndDt.getTime() - taskStartDt.getTime()) / 60000) : undefined;

                                                                // Fun task card colors
                                                                const taskCardColors = status === 'success'
                                                                    ? ['#C8E6C9', '#A5D6A7', '#81C784'] as const
                                                                    : status === 'overrun'
                                                                        ? ['#FFCDD2', '#EF9A9A', '#E57373'] as const
                                                                        : ['#F5F5F5', '#EEEEEE', '#E0E0E0'] as const;

                                                                return (
                                                                    <AnimatedCard key={task._id ?? i} delay={i * 50}
                                                                                  onPress={undefined}>
                                                                        <LinearGradient
                                                                            colors={taskCardColors}
                                                                            style={[styles.card, {marginTop: i > 0 ? 8 : 0}]}
                                                                            start={{x: 0, y: 0}}
                                                                            end={{x: 1, y: 1}}
                                                                        >
                                                                            <View style={{
                                                                                flexDirection: isRTL ? 'row-reverse' : 'row',
                                                                                justifyContent: 'space-between',
                                                                                alignItems: 'center'
                                                                            }}>
                                                                                <View style={{
                                                                                    flexDirection: isRTL ? 'row-reverse' : 'row',
                                                                                    alignItems: 'center',
                                                                                    flex: 1
                                                                                }}>
                                                                                    {status === 'success' && <Text
                                                                                        style={{
                                                                                            fontSize: 20,
                                                                                            marginEnd: 8
                                                                                        }}>✅</Text>}
                                                                                    {status === 'overrun' && <Text
                                                                                        style={{
                                                                                            fontSize: 20,
                                                                                            marginEnd: 8
                                                                                        }}>⚠️</Text>}
                                                                                    <Text
                                                                                        style={[styles.taskName, {color: textColor}, rtlText]}>{task.name || 'Untitled Task'}</Text>
                                                                                </View>
                                                                                <View style={{
                                                                                    flexDirection: isRTL ? 'row-reverse' : 'row',
                                                                                    alignItems: 'center'
                                                                                }}>
                                                                                    <Text style={[styles.meta, {
                                                                                        color: textColor,
                                                                                        fontWeight: '600'
                                                                                    }, rtlText]}>
                                                                                        {task.duration ? `⏱️ ${task.duration}m` : ''}
                                                                                    </Text>
                                                                                </View>
                                                                            </View>

                                                                            {isRunning ? (
                                                                                <Timer
                                                                                    minutes={typeof task.duration === 'number' ? task.duration : 0}
                                                                                    startedAt={getTaskStart(task)}
                                                                                    resetKey={String(getTaskStart(task))}
                                                                                />
                                                                            ) : (
                                                                                <View style={{
                                                                                    flexDirection: isRTL ? 'row-reverse' : 'row',
                                                                                    alignItems: 'center',
                                                                                    marginTop: 6
                                                                                }}>
                                                                                    <IconSymbol name="clock.fill"
                                                                                                size={14}
                                                                                                color={textColor}
                                                                                                style={{marginEnd: 8}}/>
                                                                                    <Text style={[styles.meta, {
                                                                                        color: textColor,
                                                                                        fontWeight: '600'
                                                                                    }, rtlText]}>
                                                                                        {typeof actualDurationMinutes === 'number' ? formatDurationMinutes(actualDurationMinutes) : '00:00'}
                                                                                    </Text>
                                                                                </View>
                                                                            )}

                                                                            {task.description ? (
                                                                                <Text style={[styles.description, {
                                                                                    color: textColor,
                                                                                    marginTop: 8
                                                                                }, rtlText]}>
                                                                                    💬 {task.description}
                                                                                </Text>
                                                                            ) : null}
                                                                        </LinearGradient>
                                                                    </AnimatedCard>
                                                                );
                                                            });
                                                        })()
                                                    )}
                                                </LinearGradient>
                                            </AnimatedCard>
                                        ) : null}
                                    </View>
                                );
                            })}
                        </>
                    )}
                </ScrollView>
            </View>
        </ScreenTemplate>
    );
}

const styles = StyleSheet.create({
    container: {flex: 1, padding: 20, paddingTop: 16},
    title: {fontSize: 24, fontWeight: '700', marginBottom: 16, textAlign: 'center'},
    card: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    header: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center'},
    employeeName: {fontSize: 18, fontWeight: '700', color: '#212121'},
    taskName: {fontSize: 15, fontWeight: '600', color: '#424242'},
    taskNameSmall: {fontSize: 13, fontWeight: '600', color: '#424242'},
    row: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, alignItems: 'center'},
    label: {fontSize: 14, opacity: 0.85, fontWeight: '500', color: '#424242'},
    value: {fontSize: 14, fontWeight: '600', color: '#212121'},
    emptyContainer: {
        padding: 30,
        alignItems: 'center',
        borderRadius: 16,
        marginVertical: 20,
    },
    emptyText: {fontSize: 16, opacity: 0.9, textAlign: 'center', fontWeight: '500'},
    errorContainer: {
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
        backgroundColor: '#FFEBEE',
        borderRadius: 12,
    },
    errorEmoji: {fontSize: 48, marginBottom: 8},
    error: {
        color: '#C62828',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
    },
    taskList: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        marginTop: 8,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.08,
        shadowRadius: 3,
    },
    taskListTitle: {fontSize: 17, fontWeight: '700', color: '#212121'},
    taskRow: {borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingTop: 8, marginTop: 8},
    taskMeta: {fontSize: 12, opacity: 0.8, marginTop: 4},
    meta: {fontSize: 13, color: '#616161', marginTop: 4, fontWeight: '500'},
    description: {marginTop: 8, color: '#424242', fontSize: 13, fontStyle: 'italic'},
    badge: {fontSize: 16, padding: 6, borderRadius: 14, color: 'white', fontWeight: '600'},
    funHeader: {
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    funHeaderText: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
        textAlign: 'center',
        marginHorizontal: 10,
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: {width: 0, height: 1},
        textShadowRadius: 2,
    },
});
