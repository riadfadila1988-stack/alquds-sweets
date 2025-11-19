/* eslint-disable import/no-unused-modules */
import React, {useMemo, useState, useRef, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, Platform, Alert, KeyboardAvoidingView, Keyboard, Animated, TextInput}from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenTemplate } from '@/components/ScreenTemplate';
import {useUsers} from '@/hooks/use-users';
import {useWorkDayPlan} from '@/hooks/use-work-day-plan';
import {useThemeColor} from '@/hooks/use-theme-color';
import {useTranslation} from '@/app/_i18n';
import {MaterialIcons} from '@expo/vector-icons';
import {useMaterials} from '@/hooks/use-materials';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function PlanWorkDayScreen() {
    const {t} = useTranslation();
    // refs to manage scroll offset restoration when keyboard hides
    const flatListRef = useRef<FlatList<any> | null>(null);
    const prevOffsetRef = useRef<number>(0);
    // Animated value to collapse header on scroll
    const scrollY = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const onHide = () => {
            setTimeout(() => {
                try {
                    if (flatListRef.current) {
                        flatListRef.current.scrollToOffset({ offset: prevOffsetRef.current || 0, animated: true });
                    }
                } catch { }
            }, 50);
        };
        const sub = Keyboard.addListener('keyboardDidHide', onHide);
        return () => sub.remove();
    }, []);
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const router = useRouter();

    // App-wide policy: always use RTL layout
    const isRTL = true;

    // load materials so we can copy full material objects (with names) when
    // copying tasks from a task group into an assignment. If materials are not
    // loaded yet we'll fall back to preserving the id value.
    const {materials} = useMaterials();

    // We use explicit arrow-buttons for reordering across all platforms.
    // No native draggable module is used.

    const {users: allUsers} = useUsers();
    // Filter users to include only employees (declare early for dependent hooks)
    const users = allUsers.filter(u => u.role === 'employee');

    // If a `date` query param is present (format YYYY-MM-DD) prefer it when initializing the screen.
    // Also allow optional header color overrides to customize header gradient like other screens.
    const { date: dateParam, headerColor1, headerColor2 } = useLocalSearchParams<{
        date?: string;
        headerColor1?: string;
        headerColor2?: string;
    }>();

    // Header gradient colors - vibrant and energetic
    const headerGrad1 = (headerColor1 as string) || '#FF6B9D';
    const headerGrad2 = (headerColor2 as string) || '#4FACFE';
    const headerGrad3 = '#C86DD7';

    // Parse YYYY-MM-DD as a local date to avoid UTC parsing behavior of new Date('YYYY-MM-DD')
    const parseISODate = (s?: string) => {
        if (!s) return null;
        const m = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(s);
        if (m) {
            const year = Number(m[1]);
            const month = Number(m[2]);
            const day = Number(m[3]);
            // Construct a local Date at midnight local time for the given y/m/d
            const d = new Date(year, month - 1, day);
            return Number.isNaN(d.getTime()) ? null : d;
        }
        // Fallback: allow other date formats, but these may be timezone-sensitive
        const d = new Date(s);
        return Number.isNaN(d.getTime()) ? null : d;
    };

    const formatDateLocal = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const initialDate = (() => {
        const fromParam = parseISODate(typeof dateParam === 'string' ? dateParam : undefined);
        return fromParam ?? new Date();
    })();

    const [date, setDate] = useState<Date>(initialDate);
    const [editingDate, setEditingDate] = useState<string>(() => formatDateLocal(initialDate));
    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

    // If the route param changes while this screen is focused, update the displayed date to match it.
    useEffect(() => {
        if (typeof dateParam === 'string') {
            const parsed = parseISODate(dateParam);
            if (parsed) {
                // Only update if different to avoid clobbering user edits
                const iso = formatDateLocal(parsed);
                if (iso !== formatDateLocal(date)) {
                    setDate(parsed);
                    setEditingDate(iso);
                }
            }
        }
    }, [dateParam, date]);

    const isoDate = useMemo(() => formatDateLocal(date), [date]);

    const {plan, save} = useWorkDayPlan(isoDate);

    // Helper to resolve a material reference (string id, object with _id, or
    // object containing a $oid) into the full material object from
    // `materials` when possible. If the reference already looks like a
    // material object (has a `name`) we return it as-is.
    const resolveMaterialRef = React.useCallback((ref: any) => {
        if (!ref) return ref;
        // Already a material-like object
        if (typeof ref === 'object') {
            if (ref.name) return ref;
            // object with _id
            const maybeId = ref._id ?? ref.id ?? (ref.$oid ?? (ref.$id ?? null));
            if (maybeId) {
                return materials?.find((m: any) => String(m._id) === String(maybeId)) ?? ref;
            }
            return ref;
        }
        // If it's a string, try to find it in materials
        if (typeof ref === 'string') {
            return materials?.find((m: any) => String(m._id) === ref || String(m._id) === String(ref)) ?? ref;
        }
        return ref;
    }, [materials]);

    // Helper to extract an id from a material reference (object or string).
    const materialIdFrom = (ref: any) => {
        if (!ref) return ref;
        if (typeof ref === 'object') return ref._id ?? ref.id ?? ref?.$oid ?? ref?.$id ?? undefined;
        return ref; // string id
    };

    // local assignments state to allow editing before saving
    const [assignments, setAssignments] = useState<any[]>(() => {
        if (plan && plan.assignments) return plan.assignments.map((a: any) => ({...a}));
        return [];
    });

    // Prepare assignments for saving: normalize durations/quantities and convert
    // any resolved material objects back to string ids. Reused by the auto-save in
    // toggleUser to avoid duplication.
    const prepareAssignmentsForSave = (assigns: any[]) => {
        return (assigns || []).map((a: any) => ({
            ...a,
            tasks: (a.tasks || []).map((t: any) => ({
                ...t,
                duration: (() => {
                    const d = t?.duration;
                    const n = Number(d);
                    return Number.isFinite(n) ? n : 0;
                })(),
                // Normalize scheduled start (startAt): accept 'HH:mm' or ISO and convert 'HH:mm' into a Date on the plan's date
                startAt: (() => {
                    const sa = t?.startAt;
                    if (sa === undefined || sa === null || sa === '') return undefined;
                    try {
                        if (typeof sa === 'string') {
                            if (sa.includes('T')) {
                                // probably an ISO string already
                                const dObj = new Date(sa);
                                if (!Number.isNaN(dObj.getTime())) return dObj;
                                return sa;
                            }
                            const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(sa);
                            if (m) {
                                const hh = Number(m[1]);
                                const mm = Number(m[2]);
                                return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hh, mm, 0, 0);
                            }
                        }
                        if (typeof sa === 'number') {
                            const dObj = new Date(sa);
                            if (!Number.isNaN(dObj.getTime())) return dObj;
                        }
                        return sa;
                    } catch {
                        return sa;
                    }
                })(),
                // keep the original HH:mm string when present so the UI can display it unchanged
                startAtString: (() => {
                    const sa = t?.startAtString ?? t?.startAt;
                     if (sa === undefined || sa === null || sa === '') return undefined;
                     try {
                         if (typeof sa === 'string') {
                             const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(sa);
                             if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
                             // if it's ISO, format to local HH:mm (but preserve original string could be fine too)
                             if (sa.includes('T')) {
                                 const dObj = new Date(sa);
                                 if (!Number.isNaN(dObj.getTime())) return `${String(dObj.getHours()).padStart(2, '0')}:${String(dObj.getMinutes()).padStart(2, '0')}`;
                             }
                         }
                         return undefined;
                     } catch {
                         return undefined;
                     }
                 })(),
                usedMaterials: (t.usedMaterials || []).map((um: any) => ({
                    ...um,
                    material: (() => {
                        const mid = materialIdFrom((um as any)?.material);
                        if (mid !== undefined && mid !== null) return String(mid);
                        return (um as any)?.material;
                    })(),
                    quantity: (() => {
                        const q = (um as any)?.quantity;
                        const nq = Number(q);
                        return Number.isFinite(nq) ? nq : 0;
                    })(),
                })),
            }))
        }));
    };

    // Track which assignment (by user id) is currently expanded. Only one may be open at a time.
    const [openAssignmentUser, setOpenAssignmentUser] = useState<string | null>(null);

    const TARGET_DAY_MINUTES = 480; // 8h reference for progress bars
    const [employeeSearch, setEmployeeSearch] = useState('');
    const filteredUsers = useMemo(() => {
        if (!employeeSearch.trim()) return users;
        const term = employeeSearch.trim().toLowerCase();
        return users.filter(u => (u.name || u.idNumber || '').toLowerCase().includes(term));
    }, [users, employeeSearch]);

    // animated rotation for expand icons per assignment
    const expandAnimMap = useRef(new Map<string, Animated.Value>()).current;
    const getExpandAnim = (id: string) => {
      if (!expandAnimMap.has(id)) expandAnimMap.set(id, new Animated.Value(0)); // 0 collapsed, 1 expanded
      return expandAnimMap.get(id)!;
    };
    const toggleAssignmentOpen = (userId: string) => {
      setOpenAssignmentUser(prev => {
        const next = prev === userId ? null : userId;
        // animate rotation
        const anim = getExpandAnim(userId);
        Animated.timing(anim, { toValue: next === userId ? 1 : 0, duration: 220, useNativeDriver: true }).start();
        return next;
      });
    };

    // When materials become available, reconcile any already-added assignments
    // (e.g. groups added before materials loaded) so usedMaterials material
    // references are replaced with the resolved material objects where possible.
    React.useEffect(() => {
        if (!materials || materials.length === 0) return;
        setAssignments(prev => prev.map((a: any) => ({
            ...a,
            tasks: (a.tasks || []).map((t: any) => ({
                ...t,
                usedMaterials: (t.usedMaterials || []).map((um: any) => {
                    const resolved = resolveMaterialRef((um as any)?.material);
                    if (resolved) return {...um, material: resolved};
                    // Could not resolve: log for diagnostics so developer can see missing ids
                    try {
                        const orig = (um as any)?.material;
                        const id = typeof orig === 'object' ? (orig._id ?? orig.id ?? orig?.$oid ?? orig?.$id) : orig;
                        if (id) console.warn(`[PlanWorkDay] unresolved material id during reconcile: ${String(id)}`);
                    } catch {
                        // ignore
                    }
                    return um;
                }),
            })),
        })));
    }, [materials, resolveMaterialRef]);

    // keep assignments in sync when plan loads (resolve material ids to
    // material objects when possible so the UI shows material.name instead
    // of raw ids). We depend on `materials` so if materials arrive later we
    // re-run and resolve any id placeholders.
    React.useEffect(() => {
        if (plan && plan.assignments) {
            const mapped = (plan.assignments || []).map((a: any) => ({
                ...a,
                tasks: (a.tasks || []).map((t: any) => ({
                    ...t,
                    usedMaterials: (t.usedMaterials || []).map((um: any) => {
                        const resolved = resolveMaterialRef((um as any)?.material);
                        return resolved ? {...um, material: resolved} : um;
                    }),
                })),
            }));
            setAssignments(mapped);
        } else {
            setAssignments([]);
        }
    }, [plan, materials, resolveMaterialRef]);

    // Helper: calculate total minutes for a given user id from current assignments
    const getTotalMinutesForUser = React.useCallback((userId: string) => {
        const assignment = assignments.find(a => String(a.user._id || a.user) === String(userId));
        if (!assignment || !assignment.tasks) return 0;
        return (assignment.tasks || []).reduce((sum: number, t: any) => {
            const dur = Number(t?.duration || 0);
            return sum + (Number.isFinite(dur) ? dur : 0);
        }, 0);
    }, [assignments]);

    // Helper: format minutes as "Xh Ym" (omit zero parts)
    const formatMinutes = (totalMinutes: number) => {
        // normalize input
        const total = Number(totalMinutes) || 0;
        const safeTotal = total < 0 ? 0 : total;
        const hours = Math.floor(safeTotal / 60);
        const minutes = safeTotal % 60;
        const hh = String(hours).padStart(2, '0');
        const mm = String(minutes).padStart(2, '0');
        return `${hh}:${mm}`;
    };

    // Helper: format a startAt value (Date object, ISO string, or 'HH:mm') for display
    const formatStartAtDisplay = (v: any) => {
        if (!v && v !== 0) return '';
        try {
            // If it's a Date-like object
            if (typeof v === 'object' && v instanceof Date) {
                if (!Number.isNaN(v.getTime())) return v.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            if (typeof v === 'string') {
                // If ISO string, extract the time component directly (avoid timezone conversion)
                if (v.includes('T')) {
                    const mIso = /T(\d{2}):(\d{2})/.exec(v);
                    if (mIso) return `${mIso[1]}:${mIso[2]}`;
                }
                const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(v);
                if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
                return v;
            }
            if (typeof v === 'number') {
                const d = new Date(v);
                if (!Number.isNaN(d.getTime())) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        } catch {}
        return '';
    };

    const toggleUser = (user: any) => {
        setAssignments(prev => {
            const exists = prev.find(a => String(a.user._id || a.user) === String(user._id));
            const newAssignments = exists ? prev.filter((a: any) => String(a.user._id || a.user) !== String(user._id)) : [...prev, {user: user._id || user, tasks: []}];

            // Fire-and-forget auto-save for the updated assignments. We prepare
            // the assignments the same way handleSave does so saved data is
            // consistent.
            (async () => {
                try {
                    await save({ date: isoDate, assignments: prepareAssignmentsForSave(newAssignments) });
                } catch (e: any) {
                    console.error('[PlanWorkDay] auto-save after toggleUser failed', e);
                    try { Alert.alert(t('error') || 'Error', String(e?.message || e)); } catch {}
                }
            })();

            return newAssignments;
        });
    };

    const prevDay = () => {
        const d = new Date(date);
        d.setDate(d.getDate() - 1);
        setDate(d);
        setEditingDate(formatDateLocal(d));
    };

    const nextDay = () => {
        const d = new Date(date);
        d.setDate(d.getDate() + 1);
        setDate(d);
        setEditingDate(formatDateLocal(d));
    };

    // icon names should follow logical action (prev/next) but flip visually
    // in RTL via container direction. We still choose icon direction so arrows
    // point the way the user expects.
    const prevIconName = isRTL ? 'chevron-right' : 'chevron-right';
    const nextIconName = isRTL ? 'chevron-left' : 'chevron-left';

    // --- Date picker component (moved inside PlanWorkDayScreen so it can access state) ---
    function DatePickerContents({ show, editing, dateProp }: { show: boolean; editing: string; dateProp: Date }) {
        const {t} = useTranslation();
        const [view, setView] = useState<'calendar'|'months'|'years'>('calendar');
        const [pickerDate, setPickerDate] = useState<Date>(parseISODate(editing) ?? dateProp ?? new Date());

        // Sync picker when modal opens. Re-run when show, editing or dateProp change.
        useEffect(() => {
            if (show) {
                const p = parseISODate(editing) ?? dateProp ?? new Date();
                setPickerDate(p);
                setView('calendar');
            }
        }, [show, editing, dateProp]);

        const monthNames = [
            'January','February','March','April','May','June','July','August','September','October','November','December'
        ];

        const daysInMonth = (y:number, m:number) => new Date(y, m + 1, 0).getDate();
        const firstWeekdayOfMonth = (y:number, m:number) => new Date(y, m, 1).getDay();

        const prevMonth = () => { const d = new Date(pickerDate); d.setMonth(d.getMonth() - 1); setPickerDate(d); setView('calendar'); };
        const nextMonth = () => { const d = new Date(pickerDate); d.setMonth(d.getMonth() + 1); setPickerDate(d); setView('calendar'); };

        const renderDays = () => {
            const y = pickerDate.getFullYear();
            const m = pickerDate.getMonth();
            const total = daysInMonth(y, m);
            const first = firstWeekdayOfMonth(y, m);
            const cells: React.ReactNode[] = [];
            for (let i = 0; i < first; i++) cells.push(<View key={'b' + i} style={[styles.dayCell]} />);
            for (let d = 1; d <= total; d++) {
                const isSelected = formatDateLocal(new Date(y, m, d)) === isoDate;
                cells.push(
                    <TouchableOpacity key={d} onPress={() => {
                        const selected = new Date(y, m, d);
                        setDate(selected);
                        setEditingDate(formatDateLocal(selected));
                        setShowDatePicker(false);
                    }} style={[styles.dayCell, isSelected ? styles.dayCellSelected : undefined]}>
                        <Text style={[styles.dayText, isSelected ? styles.dayTextSelected : undefined]}>{String(d)}</Text>
                    </TouchableOpacity>
                );
            }
            return (<View style={styles.daysGrid}>{cells}</View>);
        };

        const renderWeekdays = () => {
            const names = ['S','M','T','W','T','F','S'];
            return (
                <View style={styles.weekdayRow}>
                    {names.map((n, i) => (
                        <Text key={i} style={styles.weekdayCell}>{n}</Text>
                    ))}
                </View>
            );
        };

        const renderMonths = () => (
            <View>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                    <Text style={styles.label}>{t('selectMonth') || 'Select month'}</Text>
                </View>
                <View style={styles.monthGrid}>
                    {monthNames.map((mn, idx) => {
                        const isSel = pickerDate.getMonth() === idx;
                        return (
                            <TouchableOpacity key={idx} style={[styles.monthCell, isSel ? styles.monthCellSelected : undefined]}
                                              onPress={() => { const d = new Date(pickerDate); d.setMonth(idx); setPickerDate(d); setView('calendar'); }}>
                                <Text style={isSel ? styles.monthTextSelected : undefined}>{mn.substr(0,3)}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );

        const renderYears = () => {
            const center = pickerDate.getFullYear();
            const start = center - 6;
            const years: number[] = [];
            for (let y = start; y < start + 15; y++) years.push(y);
            return (
                <View>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                        <Text style={styles.label}>{t('selectYear') || 'Select year'}</Text>
                    </View>
                    <View style={styles.yearGrid}>
                        {years.map((y) => (
                            <TouchableOpacity key={y} style={[styles.yearCell, y === pickerDate.getFullYear() ? styles.monthCellSelected : undefined]}
                                              onPress={() => { const d = new Date(pickerDate); d.setFullYear(y); setPickerDate(d); setView('calendar'); }}>
                                <Text style={y === pickerDate.getFullYear() ? styles.monthTextSelected : undefined}>{String(y)}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            );
        };

        return (
            <View>
                <View style={styles.calendarHeader}>
                    <TouchableOpacity onPress={prevMonth} style={styles.monthNavBtn} accessibilityLabel={t('previousMonth') || 'Previous month'}>
                        <MaterialIcons name={isRTL ? 'chevron-right' : 'chevron-left'} size={24} color="#333" />
                    </TouchableOpacity>
                    <View style={{flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center'}}>
                        <TouchableOpacity onPress={() => setView('months')}>
                            <Text style={styles.monthYearTitle}>{monthNames[pickerDate.getMonth()]}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setView('years')} style={{marginLeft: 8}}>
                            <Text style={styles.label}>{pickerDate.getFullYear()}</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={nextMonth} style={styles.monthNavBtn} accessibilityLabel={t('nextMonth') || 'Next month'}>
                        <MaterialIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                {view === 'calendar' && (
                    <View>
                        {renderWeekdays()}
                        {renderDays()}
                    </View>
                )}
                {view === 'months' && renderMonths()}
                {view === 'years' && renderYears()}

                <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12}}>
                    <TouchableOpacity style={[styles.smallBtn, {marginRight: 8}]} onPress={() => {
                        // Apply the currently picked date (day may be from calendar view)
                        const d = new Date(pickerDate);
                        setDate(d);
                        setEditingDate(formatDateLocal(d));
                        setShowDatePicker(false);
                    }}>
                        <Text style={{color: 'white'}}>{t('set') || 'Set'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.smallBtn, {backgroundColor: '#777'}]} onPress={() => setShowDatePicker(false)}>
                        <Text style={{color: 'white'}}>{t('cancel') || 'Cancel'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
         );
     }

    // Fun gradient palettes for user chips - vibrant and playful!
    const userGradients = [
      ['#FF6B9D', '#C86DD7'] as const, // Pink to Purple
      ['#4FACFE', '#00F2FE'] as const, // Blue to Cyan
      ['#FFB75E', '#ED8F03'] as const, // Orange glow
      ['#A8E063', '#56AB2F'] as const, // Fresh green
      ['#FA709A', '#FEE140'] as const, // Pink to Yellow
      ['#30CFD0', '#330867'] as const, // Teal to Deep Purple
      ['#FF9A56', '#FF5E62'] as const, // Coral sunset
    ];

    // Total selected users
    const totalSelectedUsers = assignments.length;
    const totalMinutesAll = useMemo(() => {
      return assignments.reduce((acc, a) => acc + getTotalMinutesForUser(a.user._id || a.user), 0);
    }, [assignments, getTotalMinutesForUser]);

    // Measured height of the chips + summary block so we can animate its collapse
    const [chipAreaHeight, setChipAreaHeight] = useState(0);
    const [chipsCollapsed, setChipsCollapsed] = useState(false);

    // Modern header moved inside list
    const renderHeader = () => (
      <BlurView intensity={80} tint="light" style={styles.glassHeader}>
        <Animated.View style={{
        // interpolate vertical padding and overall opacity for subtle collapse effect
        paddingVertical: scrollY.interpolate({ inputRange: [0, 120], outputRange: [8, 2], extrapolate: 'clamp' }),
        opacity: scrollY.interpolate({ inputRange: [0, 120], outputRange: [1, 0.95], extrapolate: 'clamp' })
      }}>
      <LinearGradient
        colors={['#ffffff', '#f8f9ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.stickyHeaderContainer}
      >
        {/* Date navigation row - Fun card style */}
        <View style={styles.dateCard}>
          <LinearGradient
            colors={['#FF6B9D', '#C86DD7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.dateGradient}
          >
            <TouchableOpacity onPress={prevDay} style={styles.navIconBtnModern} accessibilityLabel={t('previousDay') || 'Previous day'}>
              <MaterialIcons name={nextIconName} size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateDisplayModern} onPress={() => { setShowDatePicker(true); setEditingDate(isoDate); }}>
              <MaterialIcons name="event" size={20} color="#fff" style={{marginRight: 8}} />
              <Text style={styles.dateTextModern}>{isoDate}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={nextDay} style={styles.navIconBtnModern} accessibilityLabel={t('nextDay') || 'Next day'}>
              <MaterialIcons name={prevIconName} size={24} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={styles.sectionHeaderRow}>
          <MaterialIcons name="people" size={22} color="#FF6B9D" />
          <Text style={styles.sectionTitleModern}>{t('employees') || 'Team Members'} ✨</Text>
          <TouchableOpacity
            onPress={() => setChipsCollapsed(c => !c)}
            style={{marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18, backgroundColor: '#FF6B9D'}}
            accessibilityLabel={chipsCollapsed ? (t('expand') || 'Expand') : (t('collapse') || 'Collapse')}
          >
            <MaterialIcons name={chipsCollapsed ? 'unfold-more' : 'unfold-less'} size={18} color="#fff" />
            <Text style={{color:'#fff', fontSize:12, fontWeight:'700', marginLeft:4}}>{chipsCollapsed ? (t('show') || 'Show') : (t('hide') || 'Hide')}</Text>
          </TouchableOpacity>
        </View>

        <Animated.View
          onLayout={(e) => { if (!chipAreaHeight) setChipAreaHeight(e.nativeEvent.layout.height); }}
          style={{
            overflow: 'hidden',
            height: chipsCollapsed ? 0 : chipAreaHeight || undefined,
            opacity: chipsCollapsed ? 0 : 1,
            transform: [{ scaleY: chipsCollapsed ? 0.9 : 1 }]
          }}
        >
        <View style={[styles.togglesContainerModern, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}>
          {filteredUsers.map((u: any, idx: number) => {
             const selected = assignments.find(a => String(a.user._id || a.user) === String(u._id));
             const assignmentForUser = assignments.find(a => String(a.user._id || a.user) === String(u._id));
             const isLocked = !!assignmentForUser && Array.isArray(assignmentForUser.tasks) && (assignmentForUser.tasks || []).some((t: any) => !!t?.startTime || !!t?.endTime);
             const grad = userGradients[idx % userGradients.length];
             const scale = getScaleForUser(String(u._id));
             const minutes = getTotalMinutesForUser(String(u._id));
             const ratio = Math.min(1, minutes / TARGET_DAY_MINUTES);
             return (
               <Animated.View key={u._id} style={{ transform: [{ scale }], alignSelf: 'flex-start' }}>
                 <TouchableOpacity
                   onPress={() => { if (!isLocked) { animatePress(String(u._id)); toggleUser(u); } }}
                   disabled={isLocked}
                   activeOpacity={0.85}
                 >
                   <LinearGradient
                     colors={selected ? grad : ['#f5f7ff', '#ffffff']}
                     start={{ x: 0, y: 0 }}
                     end={{ x: 1, y: 1 }}
                     style={[
                       styles.userChipModern,
                       selected
                         ? { shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 }
                         : { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
                       isLocked ? { opacity: 0.6 } : null
                     ]}
                   >
                     <View style={[styles.userChipContent, selected && styles.userChipContentSelected]}>
                       {selected ? (
                         <View style={styles.checkBadge}>
                           <MaterialIcons name="check-circle" size={18} color="#fff" />
                         </View>
                       ) : (
                         <MaterialIcons name="person-outline" size={18} color="#7b8aa1" />
                       )}
                       <View style={{marginLeft:10}}>
                         <Text numberOfLines={1} style={[styles.userChipTextModern, selected && styles.userChipTextSelected]}>
                           {u.name || u.idNumber || u._id}
                         </Text>
                         {selected && minutes > 0 && (
                           <View style={styles.progressBarOuterModern}>
                             <LinearGradient
                               colors={['#FFD700', '#FFA500']}
                               start={{ x: 0, y: 0 }}
                               end={{ x: 1, y: 0 }}
                               style={[styles.progressBarInnerModern, {width: `${ratio*100}%`}]}
                             />
                           </View>
                         )}
                       </View>
                       {selected && minutes > 0 && (
                         <View style={styles.minutesBadgeModern}>
                           <MaterialIcons name="schedule" size={12} color="#fff" />
                           <Text style={styles.minutesBadgeText}>{formatMinutes(minutes)}</Text>
                         </View>
                       )}
                     </View>
                   </LinearGradient>
                 </TouchableOpacity>
               </Animated.View>
             );
           })}
         </View>

         {/* Summary chips - More playful */}
         <View style={styles.selectedSummaryRowModern}>
           <LinearGradient colors={['#4FACFE', '#00F2FE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.summaryChipModern}>
             <MaterialIcons name="group" size={18} color="#fff" />
             <Text style={styles.summaryChipTextModern}>{totalSelectedUsers} {t('selected') || 'selected'}</Text>
           </LinearGradient>
           <LinearGradient colors={['#FFB75E', '#ED8F03']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.summaryChipModern}>
             <MaterialIcons name="access-time" size={18} color="#fff" />
             <Text style={styles.summaryChipTextModern}>{formatMinutes(totalMinutesAll)}</Text>
           </LinearGradient>
         </View>
        </Animated.View>

        <View style={styles.sectionHeaderRow}>
          <MaterialIcons name="assignment" size={22} color="#4FACFE" />
          <Text style={styles.sectionTitleModern}>{t('assignments') || 'Work Assignments'} 📋</Text>
        </View>
      </LinearGradient>
     </Animated.View>
    </BlurView>
  );

    // Enhance assignment card style: vibrant gradient borders + playful design
    const renderAssignment = ({item: a, index: idx}: {item: any, index: number}) => {
      const userId = String(a.user._id || a.user);
      const isOpen = openAssignmentUser === userId;
      const rotationAnim = getExpandAnim(userId);
      const rotateStyle = { transform: [{ rotate: rotationAnim.interpolate({ inputRange:[0,1], outputRange:['0deg','180deg'] }) }] };
      const userObj = users.find(u => String(u._id) === String(a.user._id || a.user)) || {name: ('User ' + (idx + 1))};
      const minutes = getTotalMinutesForUser(a.user._id || a.user);
      const ratio = Math.min(1, minutes / TARGET_DAY_MINUTES);
      const cardGrad = userGradients[(idx * 2) % userGradients.length];

      return (
        <View key={userId} style={styles.assignmentOuterModern}>
          <LinearGradient
            colors={[...cardGrad, '#ffffff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.assignmentGradientModern}
          >
            <View style={styles.assignmentInnerModern}>
              <TouchableOpacity onPress={() => toggleAssignmentOpen(userId)} style={styles.assignmentHeaderModern} activeOpacity={0.85}>
                <View style={{flex:1}}>
                  <View style={styles.assignmentTitleRow}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{userObj.name?.charAt(0) || 'U'}</Text>
                    </View>
                    <View style={{flex: 1, marginLeft: 12}}>
                      <Text style={styles.assignmentTitleModern}>{userObj.name}</Text>
                      <View style={styles.timeRow}>
                        <MaterialIcons name="schedule" size={14} color="#a0a0c0" />
                        <Text style={styles.timeText}>{formatMinutes(minutes)}</Text>
                      </View>
                    </View>
                  </View>
                  {minutes > 0 && (
                    <View style={styles.progressBarOuterCard}>
                      <LinearGradient
                        colors={cardGrad}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressBarInnerCard, {width: `${ratio*100}%`}]}
                      />
                    </View>
                  )}
                </View>
                <View style={styles.assignmentHeaderIconsModern}>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push({ pathname: '/edit-employee-tasks/[id]', params: { id: userId, date: isoDate } });
                    }}
                    style={styles.editBtnModern}
                    accessibilityLabel={t('editTasks') || 'Edit tasks'}
                  >
                    <LinearGradient colors={['#FF6B9D', '#C86DD7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.editBtnGradient}>
                      <MaterialIcons name="edit" size={16} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                  <Animated.View style={[styles.expandIconContainer, rotateStyle]}>
                    <MaterialIcons name="expand-more" size={28} color="#FF6B9D" />
                  </Animated.View>
                </View>
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.tasksContainer}>
                  {(a.tasks || []).length === 0 ? (
                    <View style={styles.emptyTasksCard}>
                      <MaterialIcons name="inbox" size={40} color="#e0e0e0" />
                      <Text style={styles.emptyTasksText}>{t('noTasks') || 'No tasks yet'}</Text>
                    </View>
                  ) : (
                    (a.tasks || []).map((task: any, ti: number) => (
                      <View key={ti} style={styles.taskRowFun}>
                        <LinearGradient
                          colors={['#ffffff', '#fafbff']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.taskCardFun}
                        >
                          <View style={styles.taskNumberBadge}>
                            <Text style={styles.taskNumberText}>{ti + 1}</Text>
                          </View>
                          <View style={{flex: 1}}>
                            <Text style={styles.taskTitleFun}>{task?.name || (t('unnamedTask') || 'Unnamed task')}</Text>
                            <View style={styles.taskMetaContainer}>
                              <View style={styles.taskMetaBadge}>
                                <MaterialIcons name="access-time" size={14} color="#4FACFE" />
                                <Text style={styles.taskMetaTextFun}>{formatMinutes(task?.duration || 0)}</Text>
                              </View>
                              {(task?.startAtString || task?.startAt) && (
                                <View style={styles.taskMetaBadge}>
                                  <MaterialIcons name="schedule" size={14} color="#FFB75E" />
                                  <Text style={styles.taskMetaTextFun}>
                                    {task?.startAtString || formatStartAtDisplay(task.startAt)}
                                  </Text>
                                </View>
                              )}
                            </View>
                            {task?.description && (
                              <Text style={styles.taskDescFun}>{task.description}</Text>
                            )}
                            {(task?.usedMaterials || []).length > 0 && (
                              <View style={styles.materialsBlockFun}>
                                <View style={styles.materialsHeader}>
                                  <MaterialIcons name="inventory" size={14} color="#A8E063" />
                                  <Text style={styles.materialsTitleFun}>{t('materials') || 'Materials'}</Text>
                                </View>
                                {(task.usedMaterials || []).map((um: any, umi: number) => {
                                  const mat = resolveMaterialRef((um as any)?.material) ?? (um as any)?.material;
                                  const name = typeof mat === 'object' ? (mat.name ?? String(mat._id ?? mat.id ?? mat)) : String(mat);
                                  return (
                                    <View key={umi} style={styles.materialItem}>
                                      <View style={styles.materialDot} />
                                      <Text style={styles.materialLineFun}>{name} × {String((um as any)?.quantity ?? 0)}</Text>
                                    </View>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                        </LinearGradient>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          </LinearGradient>
        </View>
      );
    };

    const chipScaleMap = useRef(new Map<string, Animated.Value>()).current;
    const getScaleForUser = (id: string) => {
      if (!chipScaleMap.has(id)) chipScaleMap.set(id, new Animated.Value(1));
      return chipScaleMap.get(id)!;
    };
    const animatePress = (id: string) => {
      const v = getScaleForUser(id);
      Animated.sequence([
        Animated.timing(v, { toValue: 0.94, duration: 90, useNativeDriver: true }),
        Animated.spring(v, { toValue: 1, friction: 6, useNativeDriver: true })
      ]).start();
    };

    return (
        <ScreenTemplate
            title={t('planWorkDay') || 'Plan Work Day'}
            showBackButton={true}
            headerGradient={[headerGrad1, headerGrad2, headerGrad3] as any}
        >
            <KeyboardAvoidingView
                style={{flex: 1}}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
            >
                <View style={{flex: 1}}>
                   {/* Search bar - Playful design (not sticky) */}
                   <View style={[styles.searchBarContainerModern, { marginHorizontal: 16, marginTop: 12, marginBottom: 8 }]}>
                     <MaterialIcons name="search" size={20} color="#FF6B9D" style={{marginRight:10}} />
                     <TextInput
                       value={employeeSearch}
                       onChangeText={setEmployeeSearch}
                       placeholder={t('searchEmployees') || '🔍 Search employees...'}
                       placeholderTextColor="#a0a0c0"
                       style={styles.searchInputModern}
                       returnKeyType="search"
                       blurOnSubmit={false}
                     />
                     {employeeSearch.length > 0 && (
                       <TouchableOpacity onPress={() => setEmployeeSearch('')} accessibilityLabel={t('clear') || 'Clear'}>
                         <MaterialIcons name="cancel" size={20} color="#FF6B9D" />
                       </TouchableOpacity>
                     )}
                   </View>
                   {/* Date Picker Modal (non-sticky) */}
                   <Modal
                     visible={showDatePicker}
                     transparent
                     animationType="fade"
                     onRequestClose={() => setShowDatePicker(false)}
                   >
                     <View style={styles.modalOverlay}>
                       <View style={[styles.modalInner, { alignSelf: 'stretch' }]}>
                         <DatePickerContents show={showDatePicker} editing={editingDate} dateProp={date} />
                       </View>
                     </View>
                   </Modal>
                    <FlatList
                        ref={(r) => { flatListRef.current = r; }}
                        onScroll={(e) => {
                          const y = e.nativeEvent.contentOffset.y;
                          prevOffsetRef.current = y;
                          scrollY.setValue(y);
                        }}
                        scrollEventThrottle={16}
                        data={assignments}
                        keyExtractor={(item) => String(item.user._id || item.user)}
                        ListEmptyComponent={() => (
                            <Text style={{color: textColor, paddingHorizontal: 16}}>{t('noEmployeesSelected') || 'No employees selected'}</Text>
                        )}
                        ListHeaderComponent={renderHeader}
                        stickyHeaderIndices={[0]}
                        renderItem={renderAssignment}
                        style={[styles.fullHeight, {backgroundColor}]}
                        contentContainerStyle={[styles.container, ({ writingDirection: isRTL ? 'rtl' : 'ltr' } as any)]}
                        keyboardShouldPersistTaps={'always'}
                        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                        nestedScrollEnabled={true}

                    />
                </View>
            </KeyboardAvoidingView>
        </ScreenTemplate>
    );
}

const styles = StyleSheet.create({
    // content container (no flex) so FlatList can scroll when content is smaller
    container: {
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 8,
    },
    // fullHeight used on FlatList to occupy available space
    fullHeight: {
        flex: 1,
        backgroundColor: '#f8f9ff',
    },

    // Keep essential legacy styles for date picker and modals
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    dateRow: {
        alignItems: 'center',
        marginBottom: 16,
    },
    label: {
        fontSize: 16,
        marginRight: 8,
        fontWeight: '600',
        color: '#2d2d2d',
    },
    smallBtn: {
        backgroundColor: '#FF6B9D',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
        shadowColor: '#FF6B9D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalInner: {
        width: '85%',
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 12,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 2,
        borderBottomColor: '#f0f0f5',
    },
    monthNavBtn: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#f8f9ff',
    },
    monthYearTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#2d2d2d',
    },
    weekdayRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    weekdayCell: {
        width: 36,
        textAlign: 'center',
        color: '#a0a0c0',
        fontWeight: '700',
        fontSize: 12,
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: 36,
        height: 36,
        margin: 4,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
    },
    dayText: {
        color: '#2d2d2d',
        fontWeight: '600',
    },
    dayCellSelected: {
        backgroundColor: '#FF6B9D',
        shadowColor: '#FF6B9D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    dayTextSelected: {
        color: 'white',
        fontWeight: '800',
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    monthCell: {
        width: '30%',
        padding: 12,
        marginVertical: 6,
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: '#f8f9ff',
    },
    monthCellSelected: {
        backgroundColor: '#FF6B9D',
        shadowColor: '#FF6B9D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    monthTextSelected: {
        color: 'white',
        fontWeight: '800',
    },
    yearGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    yearCell: {
        width: '30%',
        padding: 12,
        marginVertical: 6,
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: '#f8f9ff',
    },

    glassHeader: {
        borderBottomWidth: 0,
        overflow: 'visible',
    },
    stickyHeaderContainer: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      paddingBottom: 12,
    },

    // Date card - Fun gradient design
    dateCard: {
        marginBottom: 16,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#FF6B9D',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    dateGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    navIconBtnModern: {
        padding: 8,
    },
    dateDisplayModern: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateTextModern: {
        fontSize: 18,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.5,
    },

    // Search bar - Playful design
    searchBarContainerModern: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 12,
        shadowColor: '#FF6B9D',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 2,
        borderColor: '#ffe0ee',
    },
    searchInputModern: {
        flex: 1,
        fontSize: 15,
        color: '#2d2d2d',
        padding: 0,
        fontWeight: '600',
    },

    // Section headers
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 8,
    },
    sectionTitleModern: {
      fontSize: 18,
      fontWeight: '800',
      marginLeft: 8,
      color: '#2d2d2d',
    },

    // User chips - Modern vibrant design
    togglesContainerModern: {
      flexWrap: 'wrap',
      marginBottom: 16,
    },
    userChipModern: {
      borderRadius: 20,
      marginRight: 10,
      marginBottom: 12,
      overflow: 'hidden',
      alignSelf: 'flex-start',
    },
    userChipContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 18,
        margin: 2,
        // remove fixed width so it fits content
    },
    userChipContentSelected: {
        backgroundColor: 'transparent',
    },
    // Shadows and disabled state for chips
    userChipSelectedShadow: {
      shadowColor: '#FF6B9D',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 8,
    },
    userChipUnselectedShadow: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    },
    userChipLocked: {
      opacity: 0.6,
    },
    userChipTextModern: {
      fontSize: 14,
      color: '#334155',
      fontWeight: '700',
    },
    userChipTextSelected: {
      color: '#ffffff',
      textShadowColor: 'rgba(0,0,0,0.25)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    checkBadge: {
        marginRight: -2,
    },

    // Progress bars - Vibrant design
    progressBarOuterModern: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.4)',
        borderRadius: 4,
        overflow: 'hidden',
        marginTop: 6,
    },
    progressBarInnerModern: {
        height: '100%',
        borderRadius: 4,
    },

    // Minutes badge - Fun pill design
    minutesBadgeModern: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.3)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    minutesBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#fff',
        marginLeft: 4,
    },

    // Summary chips - Gradient design
    selectedSummaryRowModern: {
      flexDirection: 'row',
      marginBottom: 16,
      gap: 10,
    },
    summaryChipModern: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    summaryChipTextModern: {
      marginLeft: 8,
      fontSize: 14,
      fontWeight: '800',
      color: '#fff',
    },

    // Assignment cards - Vibrant modern design
    assignmentOuterModern: {
      marginBottom: 20,
    },
    assignmentGradientModern: {
      borderRadius: 24,
      padding: 3,
      shadowColor: '#FF6B9D',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 10,
    },
    assignmentInnerModern: {
      backgroundColor: '#fff',
      borderRadius: 21,
      padding: 20,
    },
    assignmentHeaderModern: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    assignmentTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FF6B9D',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FF6B9D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff',
    },
    assignmentTitleModern: {
      fontWeight: '800',
      color: '#2d2d2d',
      fontSize: 16,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    timeText: {
        fontSize: 13,
        color: '#a0a0c0',
        marginLeft: 4,
        fontWeight: '600',
    },
    assignmentHeaderIconsModern: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    editBtnModern: {
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: '#FF6B9D',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    editBtnGradient: {
        padding: 10,
        borderRadius: 12,
    },
    expandIconContainer: {
        padding: 4,
    },
    progressBarOuterCard: {
        height: 8,
        backgroundColor: '#f0f0f5',
        borderRadius: 8,
        overflow: 'hidden',
        marginTop: 12,
    },
    progressBarInnerCard: {
        height: '100%',
        borderRadius: 8,
    },

    // Tasks container
    tasksContainer: {
        marginTop: 16,
    },
    emptyTasksCard: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyTasksText: {
        fontSize: 14,
        color: '#c0c0c0',
        marginTop: 12,
        fontWeight: '600',
    },
    taskRowFun: {
      marginBottom: 12,
    },
    taskCardFun: {
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'flex-start',
      shadowColor: '#4FACFE',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
      borderWidth: 2,
      borderColor: '#f0f5ff',
    },
    taskNumberBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FF6B9D',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        shadowColor: '#FF6B9D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 3,
    },
    taskNumberText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#fff',
    },
    taskTitleFun: {
      fontWeight: '800',
      marginBottom: 10,
      color: '#2d2d2d',
      fontSize: 15,
    },
    taskMetaContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    taskMetaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8faff',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e8f0ff',
    },
    taskMetaTextFun: {
      color: '#6d6d8e',
      fontSize: 13,
      fontWeight: '700',
      marginLeft: 6,
    },
    taskDescFun: {
      color: '#9090b0',
      fontSize: 13,
      marginTop: 4,
      marginBottom: 8,
      lineHeight: 18,
    },
    materialsBlockFun: {
      marginTop: 12,
      backgroundColor: '#f8fff8',
      padding: 12,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#e8f8e8',
    },
    materialsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    materialsTitleFun: {
      fontWeight: '800',
      fontSize: 13,
      color: '#2d2d2d',
      marginLeft: 6,
    },
    materialItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    materialDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#A8E063',
        marginRight: 8,
    },
    materialLineFun: {
      fontSize: 13,
      color: '#6d8e6d',
      fontWeight: '600',
    },
});

