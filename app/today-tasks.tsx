import React, {useMemo, useState, useEffect, useRef, useCallback} from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    LayoutAnimation,
    Animated,
    ActivityIndicator,
    Easing
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import {useAuth} from '@/hooks/use-auth';
import {useWorkDayPlan} from '@/hooks/use-work-day-plan';
import {useThemeColor} from '@/hooks/use-theme-color';
import Timer from './components/timer';
import {createNotification} from '@/services/notification';
import {useTranslation} from './_i18n';
import {getHistory as getAttendanceHistory} from '@/services/employee-attendance';
import {MaterialIcons} from '@expo/vector-icons';
import {ScreenTemplate} from "@/components/ScreenTemplate";
import {LinearGradient} from 'expo-linear-gradient';

// Previously we enabled LayoutAnimation on Android via UIManager.setLayoutAnimationEnabledExperimental(true).
// In the New Architecture this method is a no-op and emits a JS warning. Calling it is unnecessary
// (and noisy) so we purposely avoid calling it here. LayoutAnimation.configureNext(...) calls below
// still work where supported.

export default function TodayTasksScreen() {
    const {t} = useTranslation();
    const isRTL = true;

    // intentionally using plain strings to avoid strict typed translation keys

    const {user, isLoading: authLoading} = useAuth();

    // Keep last known user id to survive brief auth nulls during navigation
    const lastUserIdRef = React.useRef<string | null>(null);
    useEffect(() => {
        const id = user ? String((user as any)._id || user) : null;
        if (id) {
            lastUserIdRef.current = id;
        } else if (!authLoading) {
            // if not loading and no user, clear last known id (true logout)
            lastUserIdRef.current = null;
        }
    }, [user, authLoading]);
    const effectiveUserId = (user ? String((user as any)._id || user) : lastUserIdRef.current) || null;

    const isoDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const {plan, isLoading: planLoading, error, save} = useWorkDayPlan(isoDate);

    // loading will include attendanceLoading and is defined after attendance state is declared
    const [localAssignments, setLocalAssignments] = useState<any[]>(() => plan?.assignments ? [...plan.assignments] : []);

    useEffect(() => {
        // sync local when plan changes — do not clear to [] during loading
        if (Array.isArray(plan?.assignments) && plan.assignments.length > 0) {
            setLocalAssignments(JSON.parse(JSON.stringify(plan.assignments)));
        }
    }, [plan]);


    // theme hooks and UI state must be called unconditionally (before early returns)
    const successBg = useThemeColor({}, 'success');
    const warningBg = useThemeColor({}, 'warning');
    const dangerBg = useThemeColor({}, 'danger');
    const tint = useThemeColor({}, 'tint');
    const textColor = useThemeColor({}, 'text');

    // Memoize assignments and tasks so hooks depending on them are stable
    const assignments = useMemo(() => localAssignments || [], [localAssignments]);
    const assignmentIndex = useMemo(() => assignments.findIndex((a: any) => String(a.user?._id || a.user) === String(effectiveUserId)), [assignments, effectiveUserId]);
    const myAssignment = assignmentIndex >= 0 ? assignments[assignmentIndex] : null;
    const tasks: any[] = useMemo(() => myAssignment?.tasks || [], [myAssignment]);

    // Show/hide completed tasks (default hide completed) — declared before filteredTasks
    const [showDoneTasks, setShowDoneTasks] = useState(false);
    const toggleAnim = React.useRef(new Animated.Value(0)).current;
    // key used to force re-mount the list when toggling filter (workaround for render edge-cases)
    const [listKey, setListKey] = useState(0);

    // Helper to detect whether a task is finished. Support multiple task shapes:
    // - old shape: startTime && endTime
    // - new shape: t.completed === true
    // - status strings: 'done' | 'finished' | 'completed'
    const isFinishedTask = (t: any) => {
        try {
            if (!t) return false;
            if (t.startTime && t.endTime) return true;
            if (typeof t.completed === 'boolean') return !!t.completed;
            const s = (t.status || '').toString().toLowerCase();
            return ['done', 'finished', 'completed'].includes(s);
        } catch {
            return false;
        }
    };

    // Derive filtered list of tasks to render (hide finished by default)
    const filteredTasks = useMemo(() => {
        if (!tasks) return [];
        return tasks.filter((t: any) => {
            const finished = isFinishedTask(t);
            return finished ? showDoneTasks : true;
        });
    }, [tasks, showDoneTasks]);

    // Determine which task (by index) has an active timer, and which is the next startable task
    const activeTaskIndex = useMemo(() => tasks.findIndex((t: any) => !!t.startTime && !t.endTime), [tasks]);
    // If there is no active task, the next startable task is the first task without a startTime
    const nextStartableIndex = activeTaskIndex >= 0 ? -1 : tasks.findIndex((t: any) => !t.startTime);

    // Timer component handles its own display - no need for parent state tracking

    // New state for overrun modal
    const [overrunModalVisible, setOverrunModalVisible] = useState(false);
    const [overrunPending, setOverrunPending] = useState<{ taskIndex: number; endTime: Date } | null>(null);
    const [overrunReason, setOverrunReason] = useState('');

    // Attendance state: null = unknown/loading, true = clocked in, false = not clocked in
    const [isClockedIn, setIsClockedIn] = useState<boolean | null>(null);
    const [attendanceLoading, setAttendanceLoading] = useState(false);

    const toggleShowDone = () => {
        const next = !showDoneTasks;
        // animate layout and swap data immediately
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowDoneTasks(next);
        // force remount and clear offsets so scroll/visibility recalculates
        setListKey(k => k + 1);
        cardOffsetsRef.current = {};
        // animate toggle visual (scale/color)
        Animated.timing(toggleAnim, {toValue: next ? 1 : 0, duration: 300, useNativeDriver: false}).start();
    };

    // Scroll handling: track ScrollView ref and per-card y offsets so we can scroll to a task
    const scrollRef = React.useRef<ScrollView | null>(null);
    const cardOffsetsRef = React.useRef<Record<number, number>>({});

    // Per-card highlight anims used when a task is started (fun little pop + glow)
    const highlightAnimsRef = React.useRef<Record<number, Animated.Value>>({});
    const getHighlightAnim = (idx: number) => {
        if (!highlightAnimsRef.current[idx]) {
            highlightAnimsRef.current[idx] = new Animated.Value(0);
        }
        return highlightAnimsRef.current[idx];
    };

    // Animation values for cards - create animated value for each task
    const pulseAnim = React.useRef(new Animated.Value(1)).current;

    // Pulse animation for active task
    useEffect(() => {
        if (activeTaskIndex >= 0) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.05,
                        duration: 1200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1200,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        }
    }, [activeTaskIndex, pulseAnim]);

    // 🚀 ROCKET LAUNCH ANIMATION STATE 🚀
    const [showRocket, setShowRocket] = useState(false);
    const rocketY = useRef(new Animated.Value(0)).current;
    const rocketX = useRef(new Animated.Value(0)).current;
    const rocketRotate = useRef(new Animated.Value(0)).current;
    const rocketScale = useRef(new Animated.Value(0)).current;
    const rocketOpacity = useRef(new Animated.Value(0)).current;

    // 🎉 PARTY CELEBRATION ANIMATION STATE 🎉
    const [showParty, setShowParty] = useState(false);
    const partyScale = useRef(new Animated.Value(0)).current;
    const partyOpacity = useRef(new Animated.Value(0)).current;
    const partyConfettiAnims = useRef<Animated.Value[]>([]);
    const partyStarsAnims = useRef<Animated.Value[]>([]);

    const launchRocket = useCallback(() => {
        setShowRocket(true);

        // Reset values
        rocketY.setValue(0);
        rocketX.setValue(0);
        rocketRotate.setValue(0);
        rocketScale.setValue(0.5);
        rocketOpacity.setValue(1);

        // Shake animation at bottom (excitement!)
        const shake = Animated.sequence([
            Animated.timing(rocketX, { toValue: -15, duration: 50, useNativeDriver: true }),
            Animated.timing(rocketX, { toValue: 15, duration: 50, useNativeDriver: true }),
            Animated.timing(rocketX, { toValue: -15, duration: 50, useNativeDriver: true }),
            Animated.timing(rocketX, { toValue: 15, duration: 50, useNativeDriver: true }),
            Animated.timing(rocketX, { toValue: -10, duration: 40, useNativeDriver: true }),
            Animated.timing(rocketX, { toValue: 10, duration: 40, useNativeDriver: true }),
            Animated.timing(rocketX, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]);

        // Launch sequence
        Animated.sequence([
            // Pop in and shake
            Animated.parallel([
                Animated.spring(rocketScale, { toValue: 1, friction: 5, useNativeDriver: true }),
                shake,
            ]),
            // Slight delay before launch
            Animated.delay(100),
            // LAUNCH! 🚀
            Animated.parallel([
                Animated.timing(rocketY, {
                    toValue: -1000,
                    duration: 1200,
                    easing: Easing.in(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(rocketRotate, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(rocketOpacity, {
                    toValue: 0,
                    duration: 800,
                    delay: 400,
                    useNativeDriver: true,
                }),
            ]),
        ]).start(() => {
            setShowRocket(false);
        });
    }, [rocketY, rocketX, rocketRotate, rocketScale, rocketOpacity]);

    const celebrateParty = useCallback(() => {
        setShowParty(true);

        // Reset values
        partyScale.setValue(0);
        partyOpacity.setValue(1);

        // Create MASSIVE confetti explosion with 100 pieces!
        partyConfettiAnims.current = [];
        partyStarsAnims.current = [];

        for (let i = 0; i < 100; i++) {
            partyConfettiAnims.current.push(new Animated.Value(0));
        }

        // 50 stars moving in random directions
        for (let i = 0; i < 50; i++) {
            partyStarsAnims.current.push(new Animated.Value(0));
        }

        // Party popper explosion animation
        const partyPopperAnimation = Animated.sequence([
            Animated.spring(partyScale, {
                toValue: 1.5,
                friction: 3,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.loop(
                Animated.sequence([
                    Animated.timing(partyScale, {
                        toValue: 1.6,
                        duration: 400,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(partyScale, {
                        toValue: 1.5,
                        duration: 400,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                { iterations: 5 }
            ),
        ]);

        // Confetti explosion
        const confettiAnimations = partyConfettiAnims.current.map((anim, i) => {
            return Animated.timing(anim, {
                toValue: 1,
                duration: 2000 + Math.random() * 1500,
                delay: Math.random() * 300,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            });
        });

        // Stars burst in random directions
        const starsAnimations = partyStarsAnims.current.map((anim, i) => {
            return Animated.timing(anim, {
                toValue: 1,
                duration: 1800 + Math.random() * 1000,
                delay: Math.random() * 400,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            });
        });

        // Run all animations
        Animated.parallel([
            partyPopperAnimation,
            ...confettiAnimations,
            ...starsAnimations,
        ]).start();

        // Fade out after 5 seconds (longer to enjoy!)
        setTimeout(() => {
            Animated.timing(partyOpacity, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
            }).start(() => {
                setShowParty(false);
            });
        }, 5000);
    }, [partyScale, partyOpacity]);

    // Load whether the current user has an open attendance session for today.
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            if (!user) { if (mounted) setIsClockedIn(false); return; }
            try {
                setAttendanceLoading(true);
                const data = await getAttendanceHistory();
                const today = new Date();
                const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
                const todays = (data.records || []).filter((s: any) => {
                    const dt = new Date(s.clockIn);
                    return dt >= startOfDay && dt < endOfDay;
                });
                const userIdStr = String(user?._id || user);
                const open = todays.find((s: any) => String(s.employeeId) === userIdStr && !s.clockOut);
                if (mounted) setIsClockedIn(!!open);
            } catch {
                if (mounted) setIsClockedIn(false);
            } finally {
                if (mounted) setAttendanceLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, [user]);

    // --- Entry loader: simplified loader matching WorkStatusScreen ---
    const [entering, setEntering] = useState(false);

    // Small focus-based loader: show on focus, hide after loading completes and a short minDelay
    useFocusEffect(
        React.useCallback(() => {
            let mounted = true;
            setEntering(true);
            const minDelay = 700;
            const checkStop = async () => {
                const start = Date.now();
                while (mounted && (authLoading || planLoading || attendanceLoading)) {
                    await new Promise(res => setTimeout(res, 80));
                }
                const elapsed = Date.now() - start;
                const remain = Math.max(0, minDelay - elapsed);
                if (remain > 0) await new Promise(res => setTimeout(res, remain));
                if (mounted) setEntering(false);
            };
            checkStop();
            return () => { mounted = false; };
        }, [authLoading, planLoading, attendanceLoading])
    );

    // --- Small Sparkle + ConfettiPiece components (copied from WorkStatusScreen) ---
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
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.timing(rotateValue, {
                        toValue: 1,
                        duration: 1000 + Math.random() * 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }, [delay]);

        const translateY = animValue.interpolate({inputRange: [0, 1], outputRange: [-20, 600]});
        const rotate = rotateValue.interpolate({inputRange: [0, 1], outputRange: ['0deg', '360deg']});

        return (
            <Animated.View
                style={{
                    position: 'absolute',
                    left: `${leftPos}%`,
                    width: 10,
                    height: 10,
                    backgroundColor: color,
                    transform: [{translateY}, {rotate}],
                    opacity: animValue.interpolate({inputRange: [0, 0.5, 1], outputRange: [0, 1, 0]}),
                }}
            />
        );
    };

    const Sparkle = ({size = 20}: { size?: number }) => {
        const sparkleAnim = useRef(new Animated.Value(0)).current;
        useEffect(() => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(sparkleAnim, {toValue: 1, duration: 1000, useNativeDriver: true}),
                    Animated.timing(sparkleAnim, {toValue: 0, duration: 1000, useNativeDriver: true}),
                ])
            ).start();
        }, []);
        const scale = sparkleAnim.interpolate({inputRange: [0, 0.5, 1], outputRange: [0.5, 1.2, 0.5]});
        return <Animated.Text style={{fontSize: size, transform: [{scale}]}}>✨</Animated.Text>;
    };

    // 🌟 ANIMATED CARD COMPONENT 🌟
    const AnimatedCard = ({children, delay}: { children: React.ReactNode; delay: number }) => {
        const scaleValue = useRef(new Animated.Value(1)).current;
        const bounceValue = useRef(new Animated.Value(0)).current;

        useEffect(() => {
            // Simple entrance animation starting from visible (scale 1)
            Animated.sequence([
                Animated.timing(scaleValue, {
                    toValue: 1.03,
                    duration: 200,
                    delay,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleValue, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();

            // Subtle continuous bounce
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
        }, [delay, scaleValue, bounceValue]);

        const translateY = bounceValue.interpolate({inputRange: [0, 1], outputRange: [0, -5]});

        return (
            <Animated.View style={{transform: [{scale: scaleValue}, {translateY}]}}>
                {children}
            </Animated.View>
        );
    };

    if (error) {
        return (
            <View style={styles.container}>
                <Text style={styles.error}>{String(error)}</Text>
            </View>
        );
    }

    // Helper: format startAt values (Date, ISO, or HH:mm) to 'HH:mm'
    const formatStartAt = (v: any) => {
        if (!v && v !== 0) return null;
        try {
            if (v instanceof Date) {
                const hh = String(v.getHours()).padStart(2, '0');
                const mm = String(v.getMinutes()).padStart(2, '0');
                return `${hh}:${mm}`;
            }
            if (typeof v === 'number' && Number.isFinite(v)) {
                const d = new Date(v);
                const hh = String(d.getHours()).padStart(2, '0');
                const mm = String(d.getMinutes()).padStart(2, '0');
                return `${hh}:${mm}`;
            }
            if (typeof v === 'string') {
                if (v.includes('T')) {
                    const d = new Date(v);
                    if (!isNaN(d.getTime())) {
                        const hh = String(d.getHours()).padStart(2, '0');
                        const mm = String(d.getMinutes()).padStart(2, '0');
                        return `${hh}:${mm}`;
                    }
                }
                const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(v);
                if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
                return v;
            }
        } catch {
        }
        return null;
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
            tasks: (a.tasks || []).map((t: any) => ({...t})),
        }));
    };

    const persistAssignments = async (updatedAssignments: any[]) => {
        try {
            // Animate layout changes
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setLocalAssignments(updatedAssignments.map((a: any) => ({...a})));
            await save({date: isoDate, assignments: sanitizeAssignmentsForSave(updatedAssignments)});
        } catch (e: any) {
            Alert.alert(t('failedToSaveTaskTimes'), String(e?.message || e));
        }
    };

    const endActiveTaskIfAny = (assigns: any[]) => {
        // Only end active tasks for the current user
        const userIdStr = String(effectiveUserId || '');
        const now = new Date();
        return assigns.map((a: any) => {
            if (String(a.user?._id || a.user) !== userIdStr) return a;
            return {
                ...a,
                tasks: (a.tasks || []).map((t: any) => {
                    if (t.startTime && !t.endTime) {
                        return {...t, endTime: now};
                    }
                    return t;
                }),
            };
        });
    };

    const handleStart = async (taskIndex: number) => {
        if (!myAssignment) return;
        // Prevent starting a task when the user is not clocked in.
        try {
            const data = await getAttendanceHistory();
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
            const todays = (data.records || []).filter((s: any) => {
                const dt = new Date(s.clockIn);
                return dt >= startOfDay && dt < endOfDay;
            });
            const userIdStr = String(effectiveUserId || '');
            const open = todays.find((s: any) => String(s.employeeId) === userIdStr && !s.clockOut);
            if (!open) {
                Alert.alert(
                    t('mustClockIn') || 'Clock in required',
                    t('mustClockInMessage') || 'Please clock in before starting a task.'
                );
                return;
            }
        } catch (e: any) {
            Alert.alert(t('attendanceCheckFailed') || 'Attendance check failed', String(e?.message || e));
            return;
        }
        const now = new Date();
        let updated = JSON.parse(JSON.stringify(assignments));

        // If there is another active task, end it first
        updated = endActiveTaskIfAny(updated);

        // set startTime for the selected task and clear endTime
        updated = updated.map((a: any, ai: number) => {
            if (ai !== assignmentIndex) return a;
            const tasksCopy = (a.tasks || []).map((t: any, ti: number) => {
                if (ti === taskIndex) {
                    return {...t, startTime: now, endTime: t.endTime ? t.endTime : null};
                }
                return t;
            });
            return {...a, tasks: tasksCopy};
        });

        // update local state + persist
        const p = persistAssignments(updated);
        await p;

        // 🚀 LAUNCH THE ROCKET! 🚀
        try {
            launchRocket();
        } catch {
            // ignore animation errors
        }

        // Play a small highlight animation on the started card to celebrate
        try {
            const anim = getHighlightAnim(taskIndex);
            anim.setValue(0);
            Animated.sequence([
                Animated.timing(anim, {toValue: 1, duration: 220, useNativeDriver: true}),
                Animated.timing(anim, {toValue: 0, duration: 420, useNativeDriver: true}),
            ]).start();
        } catch {
            // ignore animation errors
        }
    };

    const handleEnd = async (taskIndex: number) => {
        if (!myAssignment) return;
        const now = new Date();

        // Check if the task overran its planned duration; if so, open modal to collect reason
        const t = tasks[taskIndex];
        if (t && t.startTime && typeof t.duration === 'number' && t.duration > 0) {
            const actualMin = (now.getTime() - new Date(t.startTime).getTime()) / 60000;

            // Check if task was finished FAST (≤ 80% of planned time) 🎉
            if (actualMin <= t.duration * 0.8) {
                // CELEBRATE! User was super fast! 🎉🏆
                try {
                    celebrateParty();
                } catch {
                    // ignore animation errors
                }
            }

            if (actualMin > t.duration) {
                // Show modal and defer ending until user provides a reason
                setOverrunPending({taskIndex, endTime: now});
                setOverrunReason('');
                setOverrunModalVisible(true);
                return;
            }
        }

        const updated = assignments.map((a: any, ai: number) => {
            if (ai !== assignmentIndex) return a;
            const tasksCopy = (a.tasks || []).map((t: any, ti: number) => {
                if (ti === taskIndex) {
                    return {...t, endTime: now};
                }
                return t;
            });
            return {...a, tasks: tasksCopy};
        });

        await persistAssignments(updated);
    };

    const saveOverrunAndClose = async () => {
        if (!overrunPending) return;
        const {taskIndex, endTime} = overrunPending;

        // attach endTime and overrunReason to the specific task
        const updated = assignments.map((a: any, ai: number) => {
            if (ai !== assignmentIndex) return a;
            const tasksCopy = (a.tasks || []).map((t: any, ti: number) => {
                if (ti === taskIndex) {
                    return {...t, endTime, overrunReason: overrunReason.trim() || undefined};
                }
                return t;
            });
            return {...a, tasks: tasksCopy};
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

            // debug removed
            const messageAr = `${empName} — "${taskName}" استغرق ${overtimeTextAr} أكثر. السبب: ${reasonText}`;
            await createNotification(messageAr);
            // In development, notify the user that the notification was sent (helps debug missing server-side creation)
            try {
                if (typeof __DEV__ !== 'undefined' && __DEV__) {
                    Alert.alert(t('notifications'), t('notificationSent'));
                }
            } catch {
            }
            // debug removed
        } catch (e: any) {
            // Surface failure to the user in dev so it's obvious why admins wouldn't see it
            try {
                if (typeof __DEV__ !== 'undefined' && __DEV__) {
                    Alert.alert(t('notificationFailed'), String(e?.message || e));
                }
            } catch {
            }
            // debug removed
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

    // formatElapsed computes elapsed time between start and end when end is provided
    // otherwise it computes elapsed time between start and now (used for running tasks)
    const formatElapsed = (start: string | Date | undefined, end?: string | Date | undefined) => {
        if (!start) return '00:00:00';
        const s = new Date(start).getTime();
        const e = end ? new Date(end).getTime() : Date.now();
        // guard against invalid dates
        if (isNaN(s) || isNaN(e) || e < s) {
            // if end < start, return zeroed time
            return '00:00:00';
        }
        const diff = Math.max(0, e - s);
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    return (
        <ScreenTemplate title={t('todayTasks')}>
            {/* Entry loader overlay */}
            {entering ? (
                <View style={styles.loaderOverlayContainer} pointerEvents="auto">
                    <View style={styles.loaderCard}>
                        <ActivityIndicator size="large" color="#7b61ff" />
                        <Text style={styles.loaderTitle}>{"Let's make today ✨"}</Text>
                        <Text style={styles.loaderSubtitle}>Loading your fun tasks...</Text>

                        {/* Confetti layer */}
                        <View style={styles.confettiContainer}>
                            {[...Array(12)].map((_, i) => (
                                <ConfettiPiece key={i} delay={i * 100} />
                            ))}
                        </View>
                    </View>
                 </View>
             ) : null}
             <View style={styles.screen}>
                 {/* 🎊 CONFETTI BACKGROUND 🎊 */}
                 {[...Array(15)].map((_, i) => (
                     <ConfettiPiece key={i} delay={i * 300}/>
                 ))}

                 {/* 🚀 ROCKET LAUNCH ANIMATION 🚀 */}
                 {showRocket && (
                     <Animated.View
                         style={[
                             styles.rocketContainer,
                             {
                                 transform: [
                                     { translateY: rocketY },
                                     { translateX: rocketX },
                                     { rotate: rocketRotate.interpolate({
                                         inputRange: [0, 1],
                                         outputRange: ['0deg', '10deg']
                                     })},
                                     { scale: rocketScale },
                                 ],
                                 opacity: rocketOpacity,
                             },
                         ]}
                     >
                         <View style={styles.rocket}>
                             {/* Rocket body */}
                             <View style={styles.rocketBody}>
                                 <View style={styles.rocketWindow} />
                                 <Text style={styles.rocketEmoji}>🚀</Text>
                             </View>
                             {/* Flames/exhaust */}
                             <View style={styles.rocketFlames}>
                                 <Text style={styles.flameEmoji}>🔥</Text>
                                 <Text style={[styles.flameEmoji, {fontSize: 20}]}>🔥</Text>
                                 <Text style={styles.flameEmoji}>🔥</Text>
                             </View>
                             {/* Sparkles around rocket */}
                             <Text style={[styles.sparkleEmoji, {top: -20, left: -30}]}>✨</Text>
                             <Text style={[styles.sparkleEmoji, {top: -20, right: -30}]}>✨</Text>
                             <Text style={[styles.sparkleEmoji, {bottom: 40, left: -40}]}>⭐</Text>
                             <Text style={[styles.sparkleEmoji, {bottom: 40, right: -40}]}>⭐</Text>
                         </View>
                     </Animated.View>
                 )}

                 {/* 🎉 PARTY CELEBRATION FULL-SCREEN OVERLAY 🎉 */}
                 {showParty && (
                     <Animated.View
                         style={[
                             styles.partyOverlay,
                             { opacity: partyOpacity },
                         ]}
                         pointerEvents="none"
                     >
                         {/* Animated gradient background pulses */}
                         <Animated.View
                             style={[
                                 styles.partyGradientLayer,
                                 {
                                     opacity: partyScale.interpolate({
                                         inputRange: [0, 1.2, 1.3],
                                         outputRange: [0, 0.3, 0.25],
                                     }),
                                 },
                             ]}
                         />

                         {/* Massive Confetti Explosion */}
                         {partyConfettiAnims.current.map((anim, i) => {
                             const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#7b61ff', '#ff6b92', '#ffb86l'];
                             const color = colors[i % colors.length];
                             const startX = Math.random() * 100;
                             const endX = startX + (Math.random() - 0.5) * 150;
                             const endY = 100 + Math.random() * 50;
                             const rotation = (Math.random() - 0.5) * 720;

                             const translateX = anim.interpolate({
                                 inputRange: [0, 1],
                                 outputRange: [0, endX - startX],
                             });

                             const translateY = anim.interpolate({
                                 inputRange: [0, 1],
                                 outputRange: [0, endY],
                             });

                             const rotate = anim.interpolate({
                                 inputRange: [0, 1],
                                 outputRange: ['0deg', `${rotation}deg`],
                             });

                             const opacity = anim.interpolate({
                                 inputRange: [0, 0.2, 0.8, 1],
                                 outputRange: [0, 1, 1, 0],
                             });

                             return (
                                 <Animated.View
                                     key={`confetti-${i}`}
                                     style={[
                                         styles.partyConfetti,
                                         {
                                             left: `${startX}%`,
                                             backgroundColor: color,
                                             transform: [{ translateX }, { translateY }, { rotate }],
                                             opacity,
                                         },
                                     ]}
                                 />
                             );
                         })}

                         {/* Stars moving in random directions */}
                         {partyStarsAnims.current.map((anim, i) => {
                             // Random direction for each star
                             const randomAngle = Math.random() * Math.PI * 2;
                             const randomDistance = 150 + Math.random() * 200;

                             const translateX = anim.interpolate({
                                 inputRange: [0, 1],
                                 outputRange: [0, Math.cos(randomAngle) * randomDistance],
                             });

                             const translateY = anim.interpolate({
                                 inputRange: [0, 1],
                                 outputRange: [0, Math.sin(randomAngle) * randomDistance],
                             });

                             const rotate = anim.interpolate({
                                 inputRange: [0, 1],
                                 outputRange: ['0deg', `${(Math.random() - 0.5) * 720}deg`],
                             });

                             const scale = anim.interpolate({
                                 inputRange: [0, 0.5, 1],
                                 outputRange: [0, 2, 0.8],
                             });

                             const opacity = anim.interpolate({
                                 inputRange: [0, 0.2, 0.8, 1],
                                 outputRange: [0, 1, 1, 0],
                             });

                             const starTypes = ['⭐', '✨', '💫', '🌟', '⚡'];
                             const starEmoji = starTypes[i % starTypes.length];

                             return (
                                 <Animated.Text
                                     key={`star-${i}`}
                                     style={[
                                         styles.partyStar,
                                         {
                                             transform: [{ translateX }, { translateY }, { rotate }, { scale }],
                                             opacity,
                                         },
                                     ]}
                                 >
                                     {starEmoji}
                                 </Animated.Text>
                             );
                         })}

                         {/* Center Party Popper - Pure Visual */}
                         <Animated.View
                             style={[
                                 styles.partyCenterContent,
                                 { transform: [{ scale: partyScale }] },
                             ]}
                         >
                             {/* Floating fire emojis around party popper */}
                             <Text style={[styles.floatingEmoji, {top: -60, left: -60}]}>🔥</Text>
                             <Text style={[styles.floatingEmoji, {top: -60, right: -60}]}>🔥</Text>
                             <Text style={[styles.floatingEmoji, {bottom: -60, left: -60}]}>🔥</Text>
                             <Text style={[styles.floatingEmoji, {bottom: -60, right: -60}]}>🔥</Text>

                             {/* Additional mid-point fires */}
                             <Text style={[styles.floatingEmoji, {top: -30, left: -80}]}>🔥</Text>
                             <Text style={[styles.floatingEmoji, {top: -30, right: -80}]}>🔥</Text>
                             <Text style={[styles.floatingEmoji, {bottom: -30, left: -80}]}>🔥</Text>
                             <Text style={[styles.floatingEmoji, {bottom: -30, right: -80}]}>🔥</Text>

                             {/* Main Party Popper 🎉 - GIANT */}
                             <Text style={styles.partyPopper}>🎉</Text>
                         </Animated.View>
                     </Animated.View>
                 )}

                 <ScrollView ref={scrollRef} contentContainerStyle={styles.container}>
                    {/* Playful top banner */}
                    <View style={styles.topBanner}>
                        <Text style={styles.bannerEmoji}>✨</Text>
                        <View style={styles.bannerTextWrap}>
                            <Text style={styles.bannerTitle}>{t('todayTasks')}</Text>
                            <Text style={styles.bannerSubtitle}>{t('todayTasksSubtitle') || t('haveFunToday') || 'Make today super productive and fun!'} </Text>
                        </View>
                        <View style={styles.topBannerRight}>
                            <TouchableOpacity onPress={toggleShowDone} style={styles.toggleWrap} accessibilityLabel={showDoneTasks ? 'Hide done' : 'Show done'}>
                                <Animated.View
                                    style={[
                                        styles.toggleBtn,
                                        {
                                            transform: [{scale: toggleAnim.interpolate({inputRange:[0,1], outputRange:[1,1.06]})}],
                                            // interpolate background color between white and accent
                                            backgroundColor: toggleAnim.interpolate({inputRange: [0,1], outputRange: ['#ffffff', '#7b61ff']}),
                                            borderColor: toggleAnim.interpolate({inputRange: [0,1], outputRange: ['#7b61ff', '#7b61ff']}),
                                        }
                                    ]}
                                >
                                    <MaterialIcons name={showDoneTasks ? 'visibility' : 'visibility-off'} size={18} color={showDoneTasks ? 'white' : '#7b61ff'} />
                                </Animated.View>
                                <Text style={[styles.toggleLabel, showDoneTasks ? {color: '#7b61ff', fontWeight: '800'} : null]}>{showDoneTasks ? (t('hideDone') || 'Hide done') : (t('showDone') || 'Show done')}</Text>
                             </TouchableOpacity>
                         </View>
                    </View>
                     {filteredTasks.length === 0 ? (
                        <Text style={[styles.empty, {textAlign: isRTL ? 'right' : 'left'}]}>{t('noTasksToday')}</Text>
                    ) : (
                        <View key={String(listKey)}>
                            {filteredTasks.map((task: any, visibleIdx: number) => {
                                // Map back to original task index in the assignment so handlers work
                                const origIdx = tasks.findIndex((tt: any) => (tt._id ?? tt.id) ? (tt._id ?? tt.id) === (task._id ?? task.id) : tt === task);
                                const idx = origIdx >= 0 ? origIdx : visibleIdx;

                                // Determine running/finished from data
                                const hasStart = !!task.startTime;
                                const hasEnd = !!task.endTime;
                                const isFinished = hasStart && hasEnd;
                                const runningNow = idx === activeTaskIndex;

                                const status = getTaskStatus(task);

                                const showEnd = idx === activeTaskIndex;
                                const showStart = idx === nextStartableIndex;

                                // Fun gradient colors based on status (matching WorkStatus style)
                                const cardColors = runningNow
                                    ? ['#FFF9C4', '#FFF59D', '#FFF176'] as const // Yellow for running
                                    : status === 'success'
                                        ? ['#C8E6C9', '#A5D6A7', '#81C784'] as const // Green for success
                                        : status === 'overrun'
                                            ? ['#FFCDD2', '#EF9A9A', '#E57373'] as const // Red for overrun
                                            : ['#F5F5F5', '#EEEEEE', '#E0E0E0'] as const; // Gray for pending

                                const statusEmoji = runningNow ? '🔥' : status === 'success' ? '✅' : status === 'overrun' ? '⚡' : '⏳';

                                return (
                                    <AnimatedCard key={task._id ?? idx} delay={visibleIdx * 50}>
                                        <LinearGradient
                                            colors={cardColors}
                                            style={styles.card}
                                            start={{x: 0, y: 0}}
                                            end={{x: 1, y: 1}}
                                        >
                                            <View style={[styles.cardContent, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}
                                                  onLayout={(e) => { cardOffsetsRef.current[idx] = e.nativeEvent.layout.y; }}>
                                                <View style={[styles.cardMain, {alignItems: isRTL ? 'flex-end' : 'flex-start'}]}>
                                                    <View style={[styles.titleRow, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}>
                                                        <Text style={styles.statusEmoji}>{statusEmoji}</Text>
                                                        <View style={[styles.avatar, {marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0}]}>
                                                            <Text style={styles.avatarText}>{String((task.name || '').slice(0,1)).toUpperCase() || '?'}</Text>
                                                        </View>
                                                        <Text style={[styles.taskName, {textAlign: isRTL ? 'right' : 'left'}]}>{task.name || t('untitledTask')}</Text>
                                                        {runningNow && <Sparkle size={16} />}
                                                    </View>

                                                    <View style={[styles.metaRow, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}>
                                                        <Text style={styles.durationChip}>⏱️ {task.duration ? `${task.duration}m` : t('noDuration')}</Text>
                                                        {(task.startAtString ?? task.startAt) ? (
                                                            <View style={styles.startAtChip}>
                                                                <MaterialIcons name="access-time" size={14} color="#424242" />
                                                                <Text style={styles.startAtTextSmall}>{formatStartAt(task.startAtString ?? task.startAt)}</Text>
                                                            </View>
                                                        ) : null}
                                                    </View>

                                                    {task.description ? <Text style={styles.description}>💬 {task.description}</Text> : null}
                                                </View>

                                                <View style={styles.cardAside}>
                                                    {runningNow ? (
                                                        <View style={styles.timerWrap}>
                                                            <Timer
                                                                key={`timer-${task._id ?? idx}-${String(task.startTime)}`}
                                                                minutes={typeof task.duration === 'number' ? task.duration : 0}
                                                                startedAt={task.startTime}
                                                                resetKey={String(task.startTime)}
                                                                isRunning={true}
                                                            />
                                                        </View>
                                                    ) : (
                                                        <View style={styles.elapsedWrap}>
                                                            <Text style={styles.elapsedLabel}>{t('elapsed')}</Text>
                                                            <Text style={styles.elapsedTime}>{isFinished ? formatElapsed(task.startTime, task.endTime) : (runningNow ? formatElapsed(task.startTime) : '00:00:00')}</Text>
                                                        </View>
                                                    )}

                                                    <View style={[styles.actionsRow, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}>
                                                        {showStart ? (
                                                            (() => {
                                                                const startDisabled = isClockedIn !== true;
                                                                return (
                                                                    <TouchableOpacity
                                                                        style={[styles.startBtn, startDisabled ? {opacity: 0.55} : null]}
                                                                        onPress={() => handleStart(idx)}
                                                                        disabled={startDisabled}
                                                                    >
                                                                        <MaterialIcons name="play-arrow" size={20} color="white" />
                                                                        <Text style={styles.actionText}>{t('start')}</Text>
                                                                    </TouchableOpacity>
                                                                );
                                                            })()
                                                        ) : showEnd ? (
                                                            <TouchableOpacity style={styles.endBtn} onPress={() => handleEnd(idx)}>
                                                                <MaterialIcons name="stop" size={20} color="white" />
                                                                <Text style={styles.actionText}>{t('end')}</Text>
                                                            </TouchableOpacity>
                                                        ) : null}
                                                    </View>
                                                </View>
                                            </View>

                                            {/* Decorative accent bar */}
                                            <View style={[styles.accentBar, isRTL ? {right: 12} : {left: 12}]} />

                                            {/* Highlight overlay (animated) */}
                                            <Animated.View pointerEvents="none" style={[styles.highlightOverlay, {opacity: getHighlightAnim(idx)}]} />
                                        </LinearGradient>
                                    </AnimatedCard>
                                );
                            })}
                        </View>
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
                                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                                                      style={styles.modalInner}>
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
                                        <View
                                            style={[styles.modalActions, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}>
                                            <TouchableOpacity style={[styles.actionBtn, {marginRight: 8}]}
                                                              onPress={cancelOverrun}>
                                                <Text style={{color: 'white'}}>{t('cancel')}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.actionBtn, {backgroundColor: tint}]}
                                                onPress={saveOverrunAndClose}
                                                disabled={!overrunReason.trim()}
                                            >
                                                <Text style={{color: 'white'}}>{t('save')}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </KeyboardAvoidingView>
                            </View>
                        </TouchableWithoutFeedback>
                    </Modal>
                </ScrollView>
            </View>
        </ScreenTemplate>
    );
}

const styles = StyleSheet.create({
    container: {padding: 18, flexGrow: 1, paddingTop: 24, paddingBottom: 40, backgroundColor: '#fff7fb'},
    center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
    // Top banner
    topBanner: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 14, marginBottom: 12, marginHorizontal: 4, shadowColor: '#ff66b2', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.08, shadowRadius: 20, elevation: 3},
    bannerEmoji: {fontSize: 28, marginHorizontal: 8},
    bannerTextWrap: {flex: 1},
    bannerTitle: {fontSize: 18, fontWeight: '800', color: '#333'},
    bannerSubtitle: {fontSize: 12, color: '#666', marginTop: 2},

    empty: {textAlign: 'center', color: '#666', marginTop: 40},
    card: {backgroundColor: '#fafafa', padding: 16, borderRadius: 16, marginBottom: 14, overflow: 'hidden', position: 'relative', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4},
    cardContent: {flexDirection: 'row', alignItems: 'center'},
    cardMain: {flex: 1, paddingHorizontal: 8},
    cardAside: {width: 140, alignItems: 'center', justifyContent: 'center', paddingLeft: 8, paddingRight: 4},
    accentBar: {position: 'absolute', top: 0, bottom: 0, width: 8, borderTopRightRadius: 16, borderBottomRightRadius: 16, borderTopLeftRadius: 16, borderBottomLeftRadius: 16, backgroundColor: 'rgba(123, 97, 255, 0.15)', opacity: 0.8},

    titleRow: {alignItems: 'center', marginBottom: 8, flexDirection: 'row'},
    statusEmoji: {fontSize: 24, marginRight: 8},
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    avatarText: {fontSize: 14, fontWeight: '700', color: '#212121'},

    taskName: {fontSize: 16, fontWeight: '700', color: '#212121', flex: 1},
    metaRow: {flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8, flexWrap: 'wrap'},
    durationChip: {backgroundColor: 'rgba(255,255,255,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, color: '#424242', fontWeight: '600', fontSize: 13},
    startAtChip: {flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.4)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10},
    startAtTextSmall: {marginLeft: 6, color: '#424242', fontSize: 12, fontWeight: '600'},

    description: {marginTop: 8, color: '#424242', opacity: 0.9, fontSize: 13, fontStyle: 'italic'},

    timerWrap: {alignItems: 'center', justifyContent: 'center'},
    elapsedWrap: {alignItems: 'center', justifyContent: 'center'},
    elapsedLabel: {fontSize: 12, color: '#666'},
    elapsedTime: {fontSize: 18, fontWeight: '800', color: '#222', marginTop: 6},

    actionsRow: {marginTop: 10, alignItems: 'center'},
    startBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#7b61ff', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 24, shadowColor: '#7b61ff', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6},
    endBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ff4d6d', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 24, shadowColor: '#ff4d6d', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6},
    actionText: {color: 'white', marginLeft: 8, fontWeight: '700', fontSize: 14},

    statusPill: {paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 8},
    statusPillText: {color: 'white', fontWeight: '700'},

    materialItem: {color: '#444'},
    error: {color: '#a00'},
    actionBtn: {paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6},
    badge: {fontSize: 16, padding: 4, borderRadius: 12, color: 'white'},
    startAtText: {fontSize: 13, color: '#444', marginLeft: 4},

    // Modal styles
    modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20},
    modalInner: {flex: 1, justifyContent: 'center'},
    modalCard: {backgroundColor: '#fff', borderRadius: 14, padding: 18, shadowColor: '#000', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.12, shadowRadius: 30, elevation: 8},
    modalTitle: {fontSize: 18, fontWeight: '800', marginBottom: 8},
    modalText: {color: '#444', marginBottom: 8},
    modalInput: {
        borderWidth: 1,
        borderColor: '#f0e6f9',
        backgroundColor: '#faf6ff',
        borderRadius: 10,
        padding: 10,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 12
    },
    modalActions: {flexDirection: 'row', justifyContent: 'flex-end'},
    screen: {flex: 1, backgroundColor: '#fff'},

    // Add styles for toggle button
    toggleWrap: {flexDirection: 'row', alignItems: 'center'},
    toggleBtn: {width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#7b61ff', marginRight: 8, shadowColor: '#7b61ff', shadowOffset: {width:0, height:6}, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3},
    toggleLabel: {fontSize: 13, color: '#7b61ff', fontWeight: '700'},
    topBannerRight: {position: 'absolute', right: 18, top: 14},
    // small ring for active toggle (visually combined inline when active)
    toggleActiveRing: {position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(123,97,255,0.16)', right: -4, top: -4},
    doneBadge: {backgroundColor: '#ff6b92', minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 6, paddingHorizontal: 6},
    doneBadgeText: {color: 'white', fontSize: 11, fontWeight: '800'},

    // small glow overlay used when a task is started
    highlightOverlay: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16, backgroundColor: 'rgba(123,97,255,0.12)'} ,

    // Status row styles
    statusRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#f0e6f9'},
    statusText: {fontSize: 14, color: '#333', fontWeight: '600'},
    statusHint: {fontSize: 12, color: '#666', marginTop: 4, textAlign: 'right'},

    // Debug panel styles (dev only)
    debugBox: {backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#ddd'},
    debugTitle: {fontSize: 14, fontWeight: '700', marginBottom: 8, color: '#333'},
    debugLine: {fontSize: 12, color: '#666', marginBottom: 4},

    // Loader styles
    loaderOverlayContainer: {flex: 1, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 1000},
    loaderCard: {backgroundColor: 'white', borderRadius: 16, padding: 24, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.1, shadowRadius: 8},
    loaderRing: {
        width: 64,
        height: 64,
        borderWidth: 8,
        borderColor: 'rgba(123,97,255,0.2)',
        borderRadius: 32,
        position: 'absolute',
        top: 16,
        left: 16,
    },
    loaderRingLayer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 32,
        borderWidth: 8,
        borderColor: 'rgba(123,97,255,0.2)',
    },
    loaderRingLayerThin: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 32,
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    bubblesRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16},
    bubble: {
        width: 12,
        height: 12,
        borderRadius: 6,
        position: 'relative',
        marginHorizontal: 4,
    },
    loaderTitle: {fontSize: 18, fontWeight: '700', marginTop: 12, color: '#333'},
    loaderSubtitle: {fontSize: 14, color: '#666', marginTop: 4},

    // Confetti styles
    confettiContainer: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden'},
    confetti: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 5,
        opacity: 0,
    },

    // 🚀 Rocket Animation Styles 🚀
    rocketContainer: {
        position: 'absolute',
        bottom: 100,
        left: '50%',
        marginLeft: -80,
        zIndex: 9999,
        pointerEvents: 'none',
    },
    rocket: {
        width: 160,
        height: 160,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    rocketBody: {
        width: 120,
        height: 120,
        backgroundColor: '#7b61ff',
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#7b61ff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 40,
        elevation: 10,
        borderWidth: 6,
        borderColor: '#fff',
    },
    rocketWindow: {
        position: 'absolute',
        top: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        opacity: 0.3,
    },
    rocketEmoji: {
        fontSize: 64,
        textAlign: 'center',
    },
    rocketFlames: {
        position: 'absolute',
        bottom: -50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    flameEmoji: {
        fontSize: 48,
        marginHorizontal: -4,
    },
    sparkleEmoji: {
        position: 'absolute',
        fontSize: 32,
    },

    // 🎉 Party Celebration Styles 🎉
    partyOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(123, 97, 255, 0.08)',
        zIndex: 10000,
        alignItems: 'center',
        justifyContent: 'center',
    },
    partyGradientLayer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#7b61ff',
    },
    partyConfetti: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        top: -20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 5,
    },
    partyStar: {
        position: 'absolute',
        fontSize: 40,
        top: '50%',
        left: '50%',
        marginTop: -20,
        marginLeft: -20,
        textShadowColor: 'rgba(255, 255, 255, 0.8)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    partyCenterContent: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 220,
        height: 220,
        borderRadius: 110,
        position: 'relative',
    },
    floatingEmoji: {
        position: 'absolute',
        fontSize: 56,
        textShadowColor: 'rgba(255, 100, 0, 0.8)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
    },
    partyPopper: {
        fontSize: 180,
        textAlign: 'center',
        textShadowColor: 'rgba(255, 107, 146, 0.8)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 30,
    },
});
