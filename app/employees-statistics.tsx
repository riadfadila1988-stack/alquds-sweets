import React, {useRef, useEffect} from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Animated,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useEmployeeStatistics} from '@/hooks/use-employee-statistics';
import {useScreenTransition} from '@/hooks/use-screen-transition';
import {CircularDonut} from '@/components/CircularDonut';
import { useTranslation } from '@/app/_i18n';

// Animated Employee Card Component
const EmployeeCard = ({item}: { item: any }) => {
    const { t } = useTranslation();
    const totalHoursCalc = Math.round((Number(item.totalMinutes || 0) / 60) * 10) / 10;
    const attendanceCount = Number(item.attendanceCount || 0);
    const tasksCompleted = Number(item.tasksCompleted || 0);
    const activityCountCalc = attendanceCount + tasksCompleted;

    const lateTasks = Number(item.lateTasks || 0);
    const lateTasksPct = Number(item.lateTasksPct || 0);
    const onTimeTasks = Math.max(0, tasksCompleted - lateTasks);
    const onTimeTasksPct = tasksCompleted > 0 ? Math.round((onTimeTasks / tasksCompleted) * 1000) / 10 : 0;

    const tasksHours = Number(item.tasksHours || 0);
    const otherHours = Math.max(0, totalHoursCalc - tasksHours);
    const tasksHoursPct = totalHoursCalc > 0 ? Math.round((tasksHours / totalHoursCalc) * 1000) / 10 : 0;
    const otherHoursPct = Math.max(0, 100 - tasksHoursPct);

    const chartAnim1 = useRef(new Animated.Value(0)).current;
    const chartAnim2 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(chartAnim1, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: false,
            }),
            Animated.spring(chartAnim2, {
                toValue: 1,
                tension: 50,
                friction: 7,
                delay: 100,
                useNativeDriver: false,
            }),
        ]).start();
    }, [chartAnim1, chartAnim2]);

    return (
        <View>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.materialName}>{item.employeeName}</Text>
                </View>
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>{t('employeesStats_workHours')}</Text>
                        <Text style={[styles.statValue, styles.usedValue]}>{totalHoursCalc}</Text>
                        <Text style={styles.statCount}>({activityCountCalc} {t('employeesStats_taskLabel') + (activityCountCalc === 1 ? '' : 's')})</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>{t('employeesStats_tasksCompleted')}</Text>
                        <Text style={[styles.statValue, styles.addedValue]}>{tasksCompleted}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>{t('employeesStats_lateTasks')}</Text>
                        <Text style={[styles.statValue, {color: '#D9534F'}]}>{lateTasks}</Text>
                        <Text style={styles.statCount}>({lateTasksPct}%)</Text>
                    </View>
                </View>

                {/* Modern Charts Section */}
                <View style={styles.chartsContainer}>
                    {/* Chart 1: On-time vs Late Tasks */}
                    {tasksCompleted > 0 && (
                        <View style={styles.modernChartBox}>
                            <LinearGradient
                                colors={['#ffffff', '#f8f9fa']}
                                style={styles.chartGradient}
                            >
                                <View style={styles.chartHeaderRow}>
                                    <View style={styles.chartIconContainer}>
                                        <LinearGradient
                                            colors={['#34C759', '#28A745']}
                                            style={styles.chartIcon}
                                        >
                                            <Text style={styles.chartIconText}>✓</Text>
                                        </LinearGradient>
                                    </View>
                                    <Text style={styles.modernChartTitle}>{t('employeesStats_taskPerformance')}</Text>
                                </View>

                                {/* 3D Donut Chart showing on-time percentage */}
                                <View style={{alignItems: 'center', justifyContent: 'center', marginVertical: 20}}>
                                    <CircularDonut
                                        size={180}
                                        strokeWidth={28}
                                        greenPercent={onTimeTasksPct}
                                        redPercent={lateTasksPct}
                                    >
                                        <View style={{alignItems: 'center'}}>
                                            <Text style={{
                                                fontSize: 28,
                                                fontWeight: '800',
                                                color: '#333',
                                                marginBottom: 2
                                            }}>
                                                {tasksCompleted}
                                            </Text>
                                            <Text style={{
                                                fontSize: 12,
                                                fontWeight: '600',
                                                color: '#999',
                                                letterSpacing: 0.5
                                            }}>
                                                {t('employeesStats_taskLabel')}
                                            </Text>
                                            <View style={{flexDirection: 'row', marginTop: 8, gap: 4}}>
                                                <Text style={{fontSize: 16, fontWeight: '700', color: '#34C759'}}>
                                                    {Math.round(onTimeTasksPct)}%
                                                </Text>
                                                <Text style={{fontSize: 16, fontWeight: '400', color: '#ccc'}}>|</Text>
                                                <Text style={{fontSize: 16, fontWeight: '700', color: '#FF3B30'}}>
                                                    {Math.round(lateTasksPct)}%
                                                </Text>
                                            </View>
                                        </View>
                                    </CircularDonut>
                                </View>

                                <View style={styles.modernLegend}>
                                    <View style={styles.modernLegendItem}>
                                        <LinearGradient
                                            colors={['#34C759', '#28A745']}
                                            style={styles.modernLegendDot}
                                        />
                                        <View style={styles.legendTextContainer}>
                                            <Text style={styles.legendTitle}>On time</Text>
                                            <Text style={styles.legendValue}>{onTimeTasks} tasks</Text>
                                            <Text style={styles.legendPercent}>{onTimeTasksPct}%</Text>
                                        </View>
                                    </View>
                                    {lateTasks > 0 && (
                                        <View style={styles.modernLegendItem}>
                                            <LinearGradient
                                                colors={['#FF3B30', '#D9534F']}
                                                style={styles.modernLegendDot}
                                            />
                                            <View style={styles.legendTextContainer}>
                                                <Text style={styles.legendTitle}>Late</Text>
                                                <Text style={styles.legendValue}>{lateTasks} tasks</Text>
                                                <Text style={styles.legendPercent}>{lateTasksPct}%</Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </LinearGradient>
                        </View>
                    )}

                    {/* Chart 2: Hours Breakdown */}
                    {totalHoursCalc > 0 && (
                        <View style={styles.modernChartBox}>
                            <LinearGradient
                                colors={['#ffffff', '#f8f9fa']}
                                style={styles.chartGradient}
                            >
                                <View style={styles.chartHeaderRow}>
                                    <View style={styles.chartIconContainer}>
                                        <LinearGradient
                                            colors={['#007AFF', '#0051D5']}
                                            style={styles.chartIcon}
                                        >
                                            <Text style={styles.chartIconText}>⏱</Text>
                                        </LinearGradient>
                                    </View>
                                    <Text style={styles.modernChartTitle}>{t('employeesStats_hoursBreakdown')}</Text>
                                </View>

                                <View style={styles.modernBarContainer}>
                                    <View style={styles.modernBarStack}>
                                        {/* Render static segments proportional to percent for stacked bar */}
                                        <View style={[styles.modernBarSegment, {width: `${tasksHoursPct}%`}]}>
                                            <LinearGradient
                                                colors={['#007AFF', '#0051D5']}
                                                start={{x: 0, y: 0}}
                                                end={{x: 1, y: 0}}
                                                style={styles.barGradientFill}
                                            >
                                                <Text style={styles.modernBarLabel}>{tasksHours}h</Text>
                                            </LinearGradient>
                                        </View>
                                        {otherHours > 0 && (
                                            <View style={[styles.modernBarSegment, {width: `${otherHoursPct}%`}]}>
                                                <LinearGradient
                                                    colors={['#FFB800', '#FF9500']}
                                                    start={{x: 0, y: 0}}
                                                    end={{x: 1, y: 0}}
                                                    style={styles.barGradientFill}
                                                >
                                                    <Text style={styles.modernBarLabel}>{otherHours.toFixed(1)}h</Text>
                                                </LinearGradient>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                <View style={styles.statsCardsRow}>
                                    <View style={styles.statsCard}>
                                        <LinearGradient
                                            colors={['#007AFF15', '#0051D515']}
                                            style={styles.statsCardGradient}
                                        >
                                            <Text style={styles.statsCardLabel}>{t('employeesStats_taskHours')}</Text>
                                            <Text
                                                style={[styles.statsCardValue, {color: '#007AFF'}]}>{tasksHours}</Text>
                                            <Text style={styles.statsCardPercent}>{tasksHoursPct}%</Text>
                                        </LinearGradient>
                                    </View>
                                    <View style={styles.statsCard}>
                                        <LinearGradient
                                            colors={['#FFB80015', '#FF950015']}
                                            style={styles.statsCardGradient}
                                        >
                                            <Text style={styles.statsCardLabel}>{t('employeesStats_otherHours')}</Text>
                                            <Text
                                                style={[styles.statsCardValue, {color: '#FFB800'}]}>{otherHours.toFixed(1)}</Text>
                                            <Text style={styles.statsCardPercent}>{otherHoursPct.toFixed(1)}%</Text>
                                        </LinearGradient>
                                    </View>
                                    <View style={styles.statsCard}>
                                        <LinearGradient
                                            colors={['#34C75915', '#28A74515']}
                                            style={styles.statsCardGradient}
                                        >
                                            <Text style={styles.statsCardLabel}>{t('employeesStats_total')}</Text>
                                            <Text
                                                style={[styles.statsCardValue, {color: '#34C759'}]}>{totalHoursCalc}</Text>
                                            <Text style={styles.statsCardPercent}>100%</Text>
                                        </LinearGradient>
                                    </View>
                                </View>
                            </LinearGradient>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

export default function EmployeesStatisticsScreen(props?: {
    year?: number;
    month?: number;
    titleOverride?: string;
    setSelectedTab?: (tab: 'products' | 'employees' | 'tasks') => void
}) {
    // props may include setSelectedTab in some contexts; not used here
    const {containerStyle} = useScreenTransition();
    const currentDate = new Date();
    const selectedYear = props?.year ?? currentDate.getFullYear();
    const selectedMonth = props?.month ?? (currentDate.getMonth() + 1);

    const {statistics, isLoading, error, refetch} = useEmployeeStatistics(selectedYear, selectedMonth);

    const renderItem = ({item}: any) => <EmployeeCard item={item}/>;

    const { t } = useTranslation();

    return (
        <ScrollView>
            <Animated.View style={containerStyle}>
                {/* Summary */}
                {!isLoading && statistics && statistics.length > 0 && (() => {
                    // compute aggregated totals
                    const totalEmployeesHours = statistics.reduce((sum: number, it: any) => sum + (Number(it.totalHours) || 0), 0);
                    const totalEmployeesTaskHours = statistics.reduce((sum: number, it: any) => sum + (Number(it.tasksHours) || 0), 0);
                    const totalCompletedTasks = statistics.reduce((sum: number, it: any) => sum + (Number(it.tasksCompleted) || 0), 0);
                    const totalLateTasks = statistics.reduce((sum: number, it: any) => sum + (Number(it.lateTasks) || 0), 0);

                    const taskHoursPct = totalEmployeesHours > 0 ? Math.round((totalEmployeesTaskHours / totalEmployeesHours) * 100) : 0;
                    const onTimeTaskPct = totalCompletedTasks > 0 ? Math.round(((totalCompletedTasks - totalLateTasks) / totalCompletedTasks) * 100) : 0;

                    return (
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryTitle}>{props?.titleOverride ?? t('employeesStats')}</Text>
                            <View style={styles.summaryRow}>
                                <View style={styles.summaryItem}>
                                    <Text style={styles.summaryLabel}>{t('employeesStats_numberOfEmployees')}</Text>
                                    <Text style={styles.summaryValue}>{statistics.length}</Text>
                                </View>
                                <View style={styles.summaryItem}>
                                    <Text style={styles.summaryLabel}>{t('employeesStats_totalHours')}</Text>
                                    <Text style={styles.summaryValue}>{Math.round(totalEmployeesHours * 10) / 10}</Text>
                                </View>
                            </View>

                            {/* Aggregated Charts */}
                            <View style={styles.summaryChartsRow}>
                                <View style={styles.summaryChartBox}>
                                    <Text style={styles.summaryChartTitle}>{t('employeesStats_employeesHoursTotal')}</Text>
                                    <CircularDonut size={100} strokeWidth={20} greenPercent={taskHoursPct}
                                                   redPercent={100 - taskHoursPct}>
                                        <View style={{alignItems: 'center'}}>
                                            <Text style={{
                                                fontSize: 12,
                                                fontWeight: '800',
                                                color: '#333'
                                            }}>{Math.round(totalEmployeesTaskHours * 10) / 10}h</Text>
                                            <Text style={{
                                                fontSize: 10,
                                                color: '#888',
                                                marginTop: 4
                                            }}>of {Math.round(totalEmployeesHours * 10) / 10}h</Text>
                                        </View>
                                    </CircularDonut>
                                </View>

                                <View style={styles.summaryChartBox}>
                                    <Text style={styles.summaryChartTitle}>{t('employeesStats_tasksCompletedVsLate')}</Text>
                                    <CircularDonut size={100} strokeWidth={20} greenPercent={onTimeTaskPct}
                                                   redPercent={100 - onTimeTaskPct}>
                                        <View style={{alignItems: 'center'}}>
                                            <Text style={{
                                                fontSize: 12,
                                                fontWeight: '800',
                                                color: '#333'
                                            }}>{totalCompletedTasks}</Text>
                                            <Text style={{
                                                fontSize: 10,
                                                color: '#888',
                                                marginTop: 4
                                            }}>{totalLateTasks} late</Text>
                                        </View>
                                    </CircularDonut>
                                </View>
                            </View>
                        </View>
                    );
                })()}

                {isLoading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#007AFF"/>
                    </View>
                ) : error ? (
                    <View style={styles.centerContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity onPress={refetch} style={styles.retryButton}>
                            <Text style={styles.retryText}>{t('retry')}</Text>
                        </TouchableOpacity>
                    </View>
                ) : statistics.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <Text style={styles.emptyText}>{t('employeesStats_noDataThisMonth')}</Text>
                    </View>
                ) : (
                    <View>
                        {statistics.map((item: any) => (
                            <View key={item._id}>
                                {renderItem({item})}
                            </View>
                        ))}
                    </View>
                )}
            </Animated.View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    // copied styles from products-statistics for consistency
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
    },
    cardHeader: {marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8},
    materialName: {fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center'},
    statsRow: {flexDirection: 'row', justifyContent: 'space-around'},
    statItem: {alignItems: 'center', flex: 1},
    statLabel: {fontSize: 12, color: '#666', marginBottom: 4},
    statValue: {fontSize: 20, fontWeight: 'bold', marginBottom: 2},
    statCount: {fontSize: 10, color: '#999'},
    usedValue: {color: '#FF3B30'},
    addedValue: {color: '#34C759'},
    positiveValue: {color: '#34C759'},

    // Modern Charts styles
    chartsContainer: {
        marginTop: 20,
        gap: 16,
    },
    modernChartBox: {
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    chartGradient: {
        padding: 20,
        borderRadius: 16,
    },
    chartHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    chartIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    chartIcon: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    chartIconText: {
        fontSize: 20,
        color: '#fff',
    },
    modernChartTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        flex: 1,
    },
    // Progress Rings
    progressRingsContainer: {
        gap: 12,
        marginBottom: 20,
    },
    progressRing: {
        height: 16,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    ringBackground: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        backgroundColor: '#E5E5EA',
        borderRadius: 8,
    },
    ringFill: {
        height: '100%',
        borderRadius: 8,
        overflow: 'hidden',
    },
    ringGradient: {
        width: '100%',
        height: '100%',
    },
    // Modern Legend
    modernLegend: {
        gap: 12,
    },
    modernLegendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 12,
        gap: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    modernLegendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendTextContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    legendTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
        flex: 1,
    },
    legendValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#333',
        marginHorizontal: 8,
    },
    legendPercent: {
        fontSize: 13,
        fontWeight: '600',
        color: '#999',
        minWidth: 50,
        textAlign: 'right',
    },
    // Modern Bar Chart
    modernBarContainer: {
        marginBottom: 20,
    },
    modernBarStack: {
        flexDirection: 'row',
        height: 50,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#E5E5EA',
    },
    modernBarSegment: {
        height: '100%',
        overflow: 'hidden',
    },
    barGradientFill: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modernBarLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#fff',
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: {width: 0, height: 1},
        textShadowRadius: 2,
    },
    // Stats Cards
    statsCardsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    statsCard: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    statsCardGradient: {
        padding: 12,
        alignItems: 'center',
        borderRadius: 12,
    },
    statsCardLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#666',
        marginBottom: 4,
        textAlign: 'center',
    },
    statsCardValue: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 2,
    },
    statsCardPercent: {
        fontSize: 11,
        fontWeight: '600',
        color: '#999',
    },

    // summary/list styles
    summaryCard: {backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 12, elevation: 2},
    summaryTitle: {fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12, textAlign: 'center'},
    summaryRow: {flexDirection: 'row', justifyContent: 'space-around'},
    summaryItem: {alignItems: 'center'},
    summaryLabel: {fontSize: 12, color: '#666', marginBottom: 4},
    summaryValue: {fontSize: 20, fontWeight: 'bold', color: '#007AFF'},
    listContent: {padding: 16, paddingTop: 0},
    centerContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20},
    errorText: {fontSize: 16, color: '#FF3B30', textAlign: 'center', marginBottom: 16},
    retryButton: {backgroundColor: '#007AFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8},
    retryText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
    emptyText: {fontSize: 16, color: '#666', textAlign: 'center'},

    // summary charts
    summaryChartsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        gap: 16,
    },
    summaryChartBox: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        backgroundColor: '#fff',
        padding: 16,
    },
    summaryChartTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
        textAlign: 'center',
    },
});
