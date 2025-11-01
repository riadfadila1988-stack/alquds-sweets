import React, {useMemo, useState, useRef, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, Platform, Alert, KeyboardAvoidingView, Keyboard, UIManager}from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from './components/header';
import {useUsers} from '@/hooks/use-users';
import {useWorkDayPlan} from '@/hooks/use-work-day-plan';
import {useThemeColor} from '@/hooks/use-theme-color';
import {useTranslation} from '@/app/_i18n';
import {MaterialIcons} from '@expo/vector-icons';
import {useMaterials} from '@/hooks/use-materials';
import { useRouter, useLocalSearchParams } from 'expo-router';
// NOTE: don't import 'react-native-draggable-flatlist' statically because it
// depends on react-native-reanimated which can throw on web (Value is not a constructor).
// We'll require it at runtime only on native platforms.

export default function PlanWorkDayScreen() {
    const {t} = useTranslation();
    // refs to manage scroll offset restoration when keyboard hides
    const flatListRef = useRef<FlatList<any> | null>(null);
    const prevOffsetRef = useRef<number>(0);
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

    // If a `date` query param is present (format YYYY-MM-DD) prefer it when initializing the screen.
    const { date: dateParam } = useLocalSearchParams<{ date?: string }>();

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
                                const base = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hh, mm, 0, 0);
                                return base;
                            }
                        }
                        if (typeof sa === 'number') {
                            const dObj = new Date(sa);
                            if (!Number.isNaN(dObj.getTime())) return dObj;
                        }
                        return sa;
                    } catch (e) {
                        return sa;
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

    // Enable LayoutAnimation on Android (experimental flag)
    useEffect(() => {
        if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
            try { UIManager.setLayoutAnimationEnabledExperimental(true); } catch { /* ignore */ }
        }
    }, []);

    // Track which assignment (by user id) is currently expanded. Only one may be open at a time.
    const [openAssignmentUser, setOpenAssignmentUser] = useState<string | null>(null);

    const toggleAssignmentOpen = (userId: string) => {
        setOpenAssignmentUser(prev => String(prev) === String(userId) ? null : String(userId));
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
    const getTotalMinutesForUser = (userId: string) => {
        const assignment = assignments.find(a => String(a.user._id || a.user) === String(userId));
        if (!assignment || !assignment.tasks) return 0;
        return (assignment.tasks || []).reduce((sum: number, t: any) => {
            const dur = Number(t?.duration || 0);
            return sum + (Number.isFinite(dur) ? dur : 0);
        }, 0);
    };

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
                if (v.includes('T')) {
                    const d = new Date(v);
                    if (!Number.isNaN(d.getTime())) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

    // Filter users to include only employees
    const users = allUsers.filter(u => u.role === 'employee');

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

    // Render header (everything above the assignments list)
    const renderHeader = () => (
        <>
            <Header title={t('planWorkDay') || 'Plan Work Day'} />
            <View style={[styles.dateRow, {flexDirection: 'row'}]}>

                <TouchableOpacity onPress={prevDay} style={styles.arrowBtn}
                                  accessibilityLabel={t('previousDay') || 'Previous day'}>
                    <MaterialIcons name={nextIconName} size={28} color={textColor}/>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateDisplay} onPress={() => {
                    setShowDatePicker(true);
                    setEditingDate(isoDate);
                }}>
                    <Text style={[styles.dateTextCenter, {color: textColor}]}>{isoDate}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={nextDay} style={styles.arrowBtn}
                                  accessibilityLabel={t('nextDay') || 'Next day'}>
                    <MaterialIcons name={prevIconName} size={28} color={textColor}/>
                </TouchableOpacity>

            </View>

            <Modal visible={showDatePicker} transparent animationType="slide"
                   onRequestClose={() => setShowDatePicker(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalInner, {alignSelf: 'stretch'}]}>
                        {/* Custom date picker: calendar, month picker, year picker */}
                        <DatePickerContents show={showDatePicker} editing={editingDate} dateProp={date} />
                    </View>
                 </View>
              </Modal>

            <Text style={[styles.sectionTitle, {color: textColor, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr'}]}>{t('employees') || 'Employees'}</Text>
            {/* Employees shown as toggle-pill buttons so admin can quickly select/deselect employees */}
            <View style={[styles.togglesContainer, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}>
                {users.map((u: any) => {
                    const selected = assignments.find(a => String(a.user._id || a.user) === String(u._id));
                    // If the employee has any task that was started or completed, we consider them locked
                    const assignmentForUser = assignments.find(a => String(a.user._id || a.user) === String(u._id));
                    const isLocked = !!assignmentForUser && Array.isArray(assignmentForUser.tasks) && (assignmentForUser.tasks || []).some((t: any) => !!t?.startTime || !!t?.endTime);
                    return (
                        <TouchableOpacity
                            key={u._id}
                            onPress={() => { if (!isLocked) toggleUser(u); }}
                            disabled={isLocked}
                            style={[
                                styles.userToggle,
                                selected ? styles.userToggleSelected : styles.userToggleUnselected,
                                isLocked ? styles.userToggleDisabled : undefined,
                            ]}
                        >
                            {/* Show name and total formatted time */}
                            <Text
                                style={[styles.userToggleText, selected && styles.userToggleTextSelected, {textAlign: isRTL ? 'right' : 'left'}]}>{(u.name || u.idNumber || u._id)}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <Text style={[styles.sectionTitle, {color: textColor, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr'}]}>{t('assignments') || 'Assignments'}</Text>
        </>
    );

    // Render each assignment (used by FlatList)
    const renderAssignment = ({item: a, index: idx}: {item: any, index: number}) => {
        const userId = String(a.user._id || a.user);
        const isOpen = openAssignmentUser === userId;
        const userObj = users.find(u => String(u._id) === String(a.user._id || a.user)) || {name: ('User ' + (idx + 1))};
        return (
            <View key={userId}
                  style={[styles.assignmentCard, {backgroundColor: '#fafafa'}]}>
                {/* Header: show user name with their total assigned time and a chevron to collapse/expand */}
                <TouchableOpacity onPress={() => toggleAssignmentOpen(userId)}
                                  style={{flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                    <Text
                        style={{fontWeight: '600', textAlign: isRTL ? 'right' : 'left'}}>{userObj.name + ' (' + formatMinutes(getTotalMinutesForUser(a.user._id || a.user)) + ')'}</Text>
                    <View style={{flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center'}}>
                        <TouchableOpacity onPress={() => router.push({ pathname: '/edit-employee-tasks/[id]', params: { id: userId, date: isoDate } })} style={{padding: 6, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0}} accessibilityLabel={t('editTasks') || 'Edit tasks'}>
                            <MaterialIcons name="edit" size={20} color="#2196F3" />
                        </TouchableOpacity>
                        <MaterialIcons name={isOpen ? 'expand-less' : 'expand-more'} size={24} color="#666" />
                    </View>
                </TouchableOpacity>

                {/* Only render the assignment details (tasks, buttons) when this assignment is open */}
                {isOpen && (
                    <View style={{marginTop: 8}}>
                        {/* Render tasks with Up/Down arrow buttons for reordering on all platforms */}
                        {(a.tasks || []).map((task: any, ti: number) => (
                            <View key={ti} style={{flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', marginVertical: 6}}>
                                <View style={{flex: 1}} pointerEvents="box-none">
                                    {/* Static read-only task card (replaces interactive Task component) */}
                                    <View style={styles.staticTaskCard}>
                                        <Text style={{fontWeight: '600', marginBottom: 4}}>{task?.name || (t('unnamedTask') || 'Unnamed task')}</Text>
                                        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
                                            <MaterialIcons name="access-time" size={16} color="#444" style={{marginRight: 6}} />
                                            <Text style={{color: '#444'}}>{formatMinutes(task?.duration || 0)}</Text>
                                        </View>
                                        {/* scheduled start (startAt) */}
                                        {task?.startAt ? (
                                            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
                                                <MaterialIcons name="schedule" size={16} color="#444" style={{marginRight: 6}} />
                                                <Text style={{color: '#444'}}>{formatStartAtDisplay(task.startAt)}</Text>
                                            </View>
                                        ) : null}
                                        {task?.description ? <Text style={{color: '#666', marginBottom: 6, textAlign: 'right'}}>{task.description}</Text> : null}
                                        {(task?.usedMaterials || []).length > 0 && (
                                            <View style={{marginTop: 4}}>
                                                <Text style={{fontWeight: '600', marginBottom: 2}}>{t('materials') || 'Materials'}:</Text>
                                                {(task.usedMaterials || []).map((um: any, umi: number) => {
                                                    const mat = resolveMaterialRef((um as any)?.material) ?? (um as any)?.material;
                                                    const name = typeof mat === 'object' ? (mat.name ?? String(mat._id ?? mat.id ?? mat)) : String(mat);
                                                    return (
                                                        <Text key={umi} style={{color: '#555'}}>- {name} x {String((um as any)?.quantity ?? 0)}</Text>
                                                    );
                                                })}
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );
    };

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
                        const edt = parseISODate(editing);
                        const d = edt ?? new Date(pickerDate.getFullYear(), pickerDate.getMonth(), 1);
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

    return (
        <KeyboardAvoidingView
            style={{flex: 1}}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
        >
            <SafeAreaView style={{flex: 1}} edges={['bottom']}>
                {/* Fixed header + employees area (does not scroll) */}
                {renderHeader()}

                <FlatList
                 ref={(r) => { flatListRef.current = r; }}
                 onScroll={(e) => { prevOffsetRef.current = e.nativeEvent.contentOffset.y; }}
                 scrollEventThrottle={16}
                  data={assignments}
                  keyExtractor={(item) => String(item.user._id || item.user)}
                 ListEmptyComponent={() => (
                    <Text style={{color: textColor, paddingHorizontal: 16}}>{t('noEmployeesSelected') || 'No employees selected'}</Text>
                )}
                 renderItem={renderAssignment}
                 // FlatList should fill the available space under the fixed header
                 style={[styles.fullHeight, {backgroundColor}]}
                 // writingDirection is not present on some React Native TypeScript defs; cast the inline style to `any`
                 contentContainerStyle={[styles.container, ({ writingDirection: isRTL ? 'rtl' : 'ltr' } as any)]}
                 keyboardShouldPersistTaps={'handled'}
                 keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                 nestedScrollEnabled={true}
                 />
             </SafeAreaView>
         </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    // content container (no flex) so FlatList can scroll when content is smaller
    container: {
        padding: 16,
        paddingBottom: 16,
    },
    // fullHeight used on FlatList to occupy available space
    fullHeight: {
        flex: 1,
    },
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
    },
    dateButton: {
        backgroundColor: '#2196F3',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 4,
    },
    smallBtn: {
        backgroundColor: '#2196F3',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
    },
    togglesContainer: {
        flexWrap: 'wrap',
        marginBottom: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    userToggle: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 8,
    },
    userToggleSelected: {
        backgroundColor: '#2196F3',
    },
    userToggleUnselected: {
        backgroundColor: '#ddd',
    },
    userToggleDisabled: {
        backgroundColor: '#bbb',
    },
    userToggleText: {
        fontSize: 14,
    },
    userToggleTextSelected: {
        color: 'white',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    assignmentCard: {
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
        elevation: 1,
        justifyContent: "flex-start"
    },
    staticTaskCard: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 6,
        elevation: 1,
    },
    datePicker: {
        width: '100%',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 16,
    },
    dateInput: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fafafa',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    dateText: {
        fontSize: 16,
    },
    taskRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    taskInput: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#fafafa',
        borderRadius: 4,
        marginRight: 8,
    },
    groupBtn: {
        backgroundColor: '#673AB7',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 4,
        marginRight: 8,
    },
    removeBtn: {
        backgroundColor: '#F44336',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 4,
    },
    saveBtn: {
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 4,
        alignItems: 'center',
    },
    arrowBtn: {
        padding: 8,
        borderRadius: 4,
        marginHorizontal: 8,
    },
    dateDisplay: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fafafa',
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateTextCenter: {
        fontSize: 16,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalInner: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        elevation: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 8,
        borderRadius: 6,
        backgroundColor: '#fafafa',
    },
    /* Calendar styles */
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    monthNavBtn: {
        padding: 8,
    },
    monthYearTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    weekdayRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    weekdayCell: {
        width: 32,
        textAlign: 'center',
        color: '#666',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: 32,
        height: 32,
        margin: 4,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
    },
    dayText: {
        color: '#222',
    },
    dayCellSelected: {
        backgroundColor: '#2196F3',
    },
    dayTextSelected: {
        color: 'white',
        fontWeight: '600',
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    monthCell: {
        width: '30%',
        padding: 8,
        marginVertical: 6,
        alignItems: 'center',
        borderRadius: 6,
        backgroundColor: '#fafafa',
    },
    monthCellSelected: {
        backgroundColor: '#2196F3',
    },
    monthTextSelected: {
        color: 'white',
    },
    yearGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    yearCell: {
        width: '30%',
        padding: 8,
        marginVertical: 6,
        alignItems: 'center',
        borderRadius: 6,
        backgroundColor: '#fafafa',
    },
});

