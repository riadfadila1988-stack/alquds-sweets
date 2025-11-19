import React, {useCallback, useMemo, useState, useRef, useEffect} from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Animated,
    FlatList,
    ListRenderItemInfo,
    ViewToken,
} from 'react-native';
import {useTaskStatistics} from '@/hooks/use-task-statistics';
import {useScreenTransition} from '@/hooks/use-screen-transition';
import {CircularDonut} from '@/components/CircularDonut';
import {TaskStats} from '@/services/task-statistics';
import {useTranslation} from '@/app/_i18n';

// Small, memoized card. Accepts `showChart` to avoid rendering heavy chart when not visible.
const TaskStatsCard = React.memo(function TaskStatsCard({item, showChart}: {item: TaskStats; showChart?: boolean}) {
    const {t} = useTranslation();
    const total = item.timesAssigned || 1;
    const completedOnTime = Math.max(0, (item.timesCompleted || 0) - (item.lateTasks || 0));
    const incomplete = Math.max(0, total - (item.timesCompleted || 0));

    // Percent values for donut (guard division by zero)
    const completedOnTimePercent = Math.round((completedOnTime / total) * 100) || 0;
    const latePercent = Math.round(((item.lateTasks || 0) / total) * 100) || 0;

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.materialName}>{item.taskName}</Text>
                <Text style={styles.materialDescription}>{item.description}</Text>
            </View>

            {/* Chart: rendered only when visible to avoid heavy work */}
            {showChart ? (
                <View style={styles.chartContainer}>
                    <CircularDonut
                        size={120}
                        strokeWidth={30}
                        greenPercent={completedOnTimePercent}
                        redPercent={latePercent}
                        animate={true}
                    >
                        <Text style={styles.chartCenterNumber}>{item.timesAssigned}</Text>
                        <Text style={styles.chartCenterLabel}>{t('tasksStatistics.assigned')}</Text>
                    </CircularDonut>

                    <View style={styles.chartLegend}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, {backgroundColor: '#34C759'}]} />
                            <Text style={styles.legendText}>{t('tasksStatistics.doneOnTime')} ({completedOnTime})</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, {backgroundColor: '#FF9500'}]} />
                            <Text style={styles.legendText}>{t('tasksStatistics.late')} ({item.lateTasks})</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, {backgroundColor: '#E8E8E8'}]} />
                            <Text style={styles.legendText}>{t('tasksStatistics.incomplete')} ({incomplete})</Text>
                        </View>
                    </View>
                </View>
            ) : (
                // Lightweight placeholder when chart is not rendered
                <View style={styles.chartPlaceholder}>
                    <Text style={styles.chartCenterLabel}>{t('tasksStatistics.assigned')}: {item.timesAssigned}</Text>
                </View>
            )}

            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>{t('tasksStatistics.lateShort')}</Text>
                    <Text style={[styles.statValue, styles.lateValue]}>{item.lateTasks}</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>{t('tasksStatistics.assigned')}</Text>
                    <Text style={[styles.statValue, styles.assignedValue]}>{item.timesAssigned}</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>{t('tasksStatistics.completed')}</Text>
                    <Text style={[styles.statValue, styles.completedValue]}>{item.timesCompleted}</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>{t('tasksStatistics.averageDuration')}</Text>
                    <Text style={[styles.statValue, styles.durationValue]}>{(item.averageDuration || 0).toFixed(0)} {t('minutesShort')}</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>{t('tasksStatistics.duration')}</Text>
                    <Text style={[styles.statValue, styles.durationValue]}>{item.duration || 0} {t('minutesShort')}</Text>
                </View>
            </View>
        </View>
    );
}, (prev, next) => prev.item._id === next.item._id && prev.showChart === next.showChart);

export default function TasksStatisticsScreen(props?: {
    year?: number;
    month?: number;
    titleOverride?: string;
    setSelectedTab?: (tab: 'products' | 'employees' | 'tasks') => void
}) {
    const {containerStyle} = useScreenTransition();
    const currentDate = new Date();
    const selectedYear = props?.year ?? currentDate.getFullYear();
    const selectedMonth = props?.month ?? (currentDate.getMonth() + 1);

    const {statistics, isLoading, error, refetch} = useTaskStatistics(selectedYear, selectedMonth);
    const {t} = useTranslation();

    // Track which items should render heavy charts
    const [visibleMap, setVisibleMap] = useState<Record<string, boolean>>({});
    // keep a ref copy so viewability handler can read latest value without stale closures
    const visibleMapRef = useRef(visibleMap);
    useEffect(() => { visibleMapRef.current = visibleMap; }, [visibleMap]);

    // use a more conservative viewability config to avoid flapping
    const viewabilityConfig = useRef({itemVisiblePercentThreshold: 80, minimumViewTime: 200, waitForInteraction: true});

    // We'll batch viewability changes to avoid many rapid setState calls which can cause update loops
    const pendingVisibleRef = useRef<Record<string, boolean> | null>(null);
    const viewabilityTimerRef = useRef<number | null>(null);

    // cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (viewabilityTimerRef.current != null) {
                clearTimeout(viewabilityTimerRef.current as unknown as number);
                viewabilityTimerRef.current = null;
            }
        };
    }, []);

    // Stable ref to count renders (for debug only)
    const renderCountRef = useRef(0);
    const [displayedRenderCount, setDisplayedRenderCount] = useState(0);

    // Sample the render count every 500ms for the debug badge without causing extra per-item updates
    useEffect(() => {
        const id = setInterval(() => {
            setDisplayedRenderCount(renderCountRef.current);
        }, 500);
        return () => clearInterval(id);
    }, []);

    // onViewableItemsChanged: accumulate changes and apply them every 150-250ms
    const onViewableItemsChanged = useRef(({viewableItems}: {viewableItems: ViewToken[]}) => {
        if (!viewableItems || viewableItems.length === 0) return;

        // initialize pending map from current visibleMapRef to keep unchanged items
        if (!pendingVisibleRef.current) {
            pendingVisibleRef.current = {...visibleMapRef.current};
        }

        viewableItems.forEach(v => {
            const id = v?.item?._id && String(v.item._id);
            if (!id) return;
            // set the desired visibility for this id
            pendingVisibleRef.current![id] = !!v.isViewable;
        });

        // schedule a batched update if not already scheduled
        if (viewabilityTimerRef.current == null) {
            viewabilityTimerRef.current = window.setTimeout(() => {
                setVisibleMap(prev => {
                    const next = {...prev};
                    let changed = false;
                    const pending = pendingVisibleRef.current || {};
                    Object.keys(pending).forEach(k => {
                        if (next[k] !== pending[k]) {
                            next[k] = pending[k];
                            changed = true;
                        }
                    });
                    // clear pending
                    pendingVisibleRef.current = null;
                    viewabilityTimerRef.current = null;
                    return changed ? next : prev;
                });
            }, 180) as unknown as number;
        }
    }).current;

    // renderItem: increments debug render counter and passes showChart flag based on visibleMap
    const renderItem = useCallback(({item}: ListRenderItemInfo<TaskStats>) => {
        renderCountRef.current += 1;
        const show = !!visibleMap[String(item._id)];
        return <TaskStatsCard item={item} showChart={show} />;
    }, [visibleMap]);

    const keyExtractor = useCallback((item: TaskStats) => String(item._id), []);

    const listHeader = useMemo(() => {
        if (!statistics || statistics.length === 0) return null;
        return (
            <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>{props?.titleOverride ?? t('tasksStatistics.title')}</Text>
                <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>{t('tasksStatistics.totalTasks')}</Text>
                        <Text style={styles.summaryValue}>{statistics.length}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>{t('tasksStatistics.timesAssigned')}</Text>
                        <Text style={styles.summaryValue}>{statistics.reduce((sum: number, it: any) => sum + (it.timesAssigned || 0), 0)}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>{t('tasksStatistics.timesCompleted')}</Text>
                        <Text style={styles.summaryValue}>{statistics.reduce((sum: number, it: any) => sum + (it.timesCompleted || 0), 0)}</Text>
                    </View>
                </View>
            </View>
        );
    }, [statistics, t, props?.titleOverride]);

    if (isLoading) {
        return (
            <Animated.View style={containerStyle}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            </Animated.View>
        );
    }

    if (error) {
        return (
            <Animated.View style={containerStyle}>
                <View style={styles.centerContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={refetch} style={styles.retryButton}>
                        <Text style={styles.retryText}>{t('retry')}</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        );
    }

    return (
        <Animated.View style={[containerStyle, {flex: 1}]}>
            <FlatList
                data={statistics || []}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                ListHeaderComponent={listHeader}
                contentContainerStyle={styles.listContent}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={11}
                removeClippedSubviews={true}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig.current}
                extraData={visibleMap}
            />

        </Animated.View>
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
    materialDescription: {fontSize: 10, color: '#666', textAlign: 'center', marginTop: 4},

    statItem: {alignItems: 'center', flex: 1},
    statLabel: {fontSize: 12, color: '#666', marginBottom: 4},
    statValue: {fontSize: 18, fontWeight: 'bold', marginBottom: 2},
    statCount: {fontSize: 10, color: '#999'},
    assignedValue: {color: '#007AFF'},
    completedValue: {color: '#34C759'},
    lateValue: {color: '#FF9500'},
    durationValue: {color: '#666'},
    usedValue: {color: '#FF3B30'},
    addedValue: {color: '#34C759'},
    positiveValue: {color: '#34C759'},

    // Chart styles
    chartContainer: {
        alignItems: 'center',
        marginVertical: 16,
    },
    chartPlaceholder: {
        alignItems: 'center',
        marginVertical: 12,
        paddingVertical: 12,
    },
    chartCenterNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    chartCenterLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    chartLegend: {
        marginTop: 16,
        alignItems: 'flex-start',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    legendColor: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: 8,
    },
    legendText: {
        fontSize: 14,
        color: '#333',
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

    // per-card stats row
    statsRow: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap'},

    /* Add debug styles below existing styles */
    debugBadge: {
        position: 'absolute',
        right: 12,
        top: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    debugText: {color: '#fff', fontSize: 12},
});
