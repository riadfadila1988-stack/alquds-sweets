import React, {useEffect, useRef, useState} from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    Animated,
    Modal,
} from 'react-native';
import {useMaterialStatistics} from '@/hooks/use-material-statistics';
import {useScreenTransition} from '@/hooks/use-screen-transition';
import {Ionicons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {useMaterials} from '@/hooks/use-materials';
import {getMaterialLogs} from '@/services/material-usage';
import {useTranslation} from '@/app/_i18n';

// Make the statistics screen reusable for materials (products), employees and tasks
export default function ProductsStatisticsScreen(props?: {
    titleOverride?: string;
    year?: number;
    month?: number;
    setSelectedTab?: (tab: 'products' | 'employees' | 'tasks') => void;
}) {
    // props may contain callbacks like setSelectedTab; access via props when needed to avoid unused-var warnings
    const {containerStyle} = useScreenTransition();
    const currentDate = new Date();
    const selectedYear = props?.year ?? currentDate.getFullYear();
    const selectedMonth = props?.month ?? (currentDate.getMonth() + 1); // 1-12
    const {t} = useTranslation();
    const {statistics, isLoading, error, refetch} = useMaterialStatistics(selectedYear, selectedMonth);
    const {materials} = useMaterials();

    // Build a lookup map materialId -> material data for quick cost lookup
    const materialsMap = React.useMemo(() => {
        const map: Record<string, any> = {};
        (materials || []).forEach((m: any) => {
            if (m._id) map[m._id] = m;
        });
        return map;
    }, [materials]);

    // Fallback map by material name (lowercased) to handle cases where stats use names instead of ids
    const materialsNameMap = React.useMemo(() => {
        const map: Record<string, any> = {};
        (materials || []).forEach((m: any) => {
            const name = (m.name || m.heName || m.materialName || '').toString().toLowerCase().trim();
            if (name) map[name] = m;
        });
        return map;
    }, [materials]);

    // Compute money totals: cost * quantity
    const totalUsedMoney = React.useMemo(() => {
        if (!statistics) return 0;
        return statistics.reduce((sum: number, s: any) => {
            let mat = materialsMap[s._id];
            if (!mat) {
                const key = (s.materialName || '').toString().toLowerCase().trim();
                mat = materialsNameMap[key];
            }
            const cost = mat?.cost ?? 0;
            return sum + (s.totalUsed || 0) * cost;
        }, 0);
    }, [statistics, materialsMap, materialsNameMap]);

    const totalAddedMoney = React.useMemo(() => {
        if (!statistics) return 0;
        return statistics.reduce((sum: number, s: any) => {
            let mat = materialsMap[s._id];
            if (!mat) {
                const key = (s.materialName || '').toString().toLowerCase().trim();
                mat = materialsNameMap[key];
            }
            const cost = mat?.cost ?? 0;
            return sum + (s.totalAdded || 0) * cost;
        }, 0);
    }, [statistics, materialsMap, materialsNameMap]);

    const formatMoney = (v: number) => {
        try {
            return new Intl.NumberFormat(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(v);
        } catch {
            return v.toFixed(2);
        }
    };

    // simple entrance animation for the screen
    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fadeAnim, {toValue: 1, duration: 500, useNativeDriver: true}).start();
    }, [fadeAnim]);

    const [refreshing, setRefreshing] = useState(false);
    // Track expanded cards by material _id
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

    // --- New state for material logs modal ---
    const [logsModalVisible, setLogsModalVisible] = useState(false);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsError, setLogsError] = useState<string | null>(null);
    const [selectedMaterialName, setSelectedMaterialName] = useState<string | null>(null);
    const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
    const [materialLogs, setMaterialLogs] = useState<any[]>([]);

    const toggleExpand = (id?: string) => {
        if (!id) return;
        setExpandedIds(prev => ({...prev, [id]: !prev[id]}));
    };
    const onRefresh = async () => {
        try {
            setRefreshing(true);
            await refetch();
        } finally {
            setRefreshing(false);
        }
    };

    // Fetch material logs from backend. Tries by id first, then by name as fallback.
    const fetchMaterialLogs = async (materialId?: string) => {
        setLogsError(null);
        setMaterialLogs([]);
        setLogsLoading(true);
        try {
            const logs = await getMaterialLogs(materialId);
            console.log('getMaterialLogs returned', Array.isArray(logs) ? logs.length : typeof logs, logs && logs.slice ? logs.slice(0, 3) : logs);
            setMaterialLogs(logs || []);
        } catch (err: any) {
            setLogsError(err?.message || 'فشل عند جلب السجلات');
        } finally {
            setLogsLoading(false);
        }
    };

    const openMaterialLogs = async (materialId?: string | null, materialName?: string | null) => {
        setSelectedMaterialId(materialId ?? null);
        setSelectedMaterialName(materialName ?? null);
        setLogsModalVisible(true);
        await fetchMaterialLogs(materialId ?? undefined);
    };

    const closeMaterialLogs = () => {
        setLogsModalVisible(false);
        setMaterialLogs([]);
        setLogsError(null);
        setSelectedMaterialId(null);
        setSelectedMaterialName(null);
    };

    const renderItem = ({item}: any) => {
        let mat = materialsMap[item._id];
        if (!mat) {
            const key = (item.materialName || '').toString().toLowerCase().trim();
            mat = materialsNameMap[key];
        }
        const cost = mat?.cost ?? 0;
        const usedMoney = (item.totalUsed || 0) * cost;
        const addedMoney = (item.totalAdded || 0) * cost;
        const netMoney = (item.netChange || 0) * cost;
        const isExpanded = expandedIds[item._id];

        return (
            <TouchableOpacity activeOpacity={0.95} style={styles.card} onPress={() => toggleExpand(item._id)}>
                <LinearGradient colors={['#ffffff', '#f8fbff']} style={styles.cardInner}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.materialName}>{item.materialName}</Text>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{item.usageCount || 0}</Text>
                        </View>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>{t('productsStats_usedLabel')}</Text>
                            <Text style={[styles.statValue, styles.usedValue]}> {item.totalUsed.toFixed(2)}</Text>
                            <Text style={styles.statCount}>({item.usageCount} {t('productsStats_typeUsed')})</Text>
                        </View>

                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>{t('productsStats_addedLabel')}</Text>
                            <Text style={[styles.statValue, styles.addedValue]}> {item.totalAdded.toFixed(2)}</Text>
                            <Text style={styles.statCount}>({item.additionCount} {t('productsStats_typeAdded')})</Text>
                        </View>

                        <View style={styles.statItemRight}>
                            <Text style={styles.statLabel}>الصافي</Text>
                            <Text
                                style={[
                                    styles.statValue,
                                    item.netChange > 0 ? styles.positiveValue : styles.negativeValue,
                                ]}
                            >
                                {item.netChange > 0 ? '+' : ''}
                                {item.netChange.toFixed(2)}
                            </Text>
                        </View>
                    </View>

                    {/* Money row (per-material totals) */}
                    <View style={styles.moneyRow}>
                        <View style={styles.moneyBlock}>
                            <Text style={styles.moneyLabel}>قيمة المستخدم</Text>
                            <Text style={styles.moneyValue}>{formatMoney(usedMoney)}</Text>
                        </View>
                        <View style={styles.moneyBlock}>
                            <Text style={styles.moneyLabel}>قيمة المضاف</Text>
                            <Text style={styles.moneyValue}>{formatMoney(addedMoney)}</Text>
                        </View>
                        <View style={styles.moneyBlock}>
                            <Text style={styles.moneyLabel}>صافي بالمال</Text>
                            <Text
                                style={[styles.moneyValue, netMoney >= 0 ? styles.positiveValue : styles.negativeValue]}>{formatMoney(netMoney)}</Text>
                        </View>
                    </View>

                    {/* Expanded details */}
                    {isExpanded && (
                        <View style={styles.expandedDetails}>
                            <Text style={styles.expandedText}>تفاصيل المادة:</Text>
                            <Text style={styles.expandedText}>- السعر للوحدة: {formatMoney(cost)}</Text>
                            <Text style={styles.expandedText}>- المبلغ المستخدم: {formatMoney(usedMoney)}</Text>
                            <Text style={styles.expandedText}>- المبلغ المضاف: {formatMoney(addedMoney)}</Text>
                            <Text style={styles.expandedText}>- صافي بالمال: {formatMoney(netMoney)}</Text>
                        </View>
                    )}

                    {/* Small action row */}
                    <View style={styles.cardFooter}>
                        <TouchableOpacity onPress={() => openMaterialLogs(item._id, item.materialName)}
                                          style={styles.footerButton}>
                            <Ionicons name="analytics" size={16} color="#fff"/>
                            <Text style={styles.footerButtonText}>{t('productsStats_viewDetails')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => {
                        }} style={styles.footerGhost}>
                            <Text style={styles.footerGhostText}>{t('productsStats_share')}</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    // Header that will be part of FlatList so whole screen scrolls
    const renderHeader = () => (
        <>
            {/* Header removed as requested - keeping only the summary (if present) */}

            {!isLoading && statistics && statistics.length > 0 && (
                <View style={styles.summaryRowOuter}>
                    <View style={styles.summaryCard}>
                        <View style={[styles.iconCircle, styles.iconPrimary]}>
                            <Ionicons name="layers" size={18} color="#fff"/>
                        </View>
                        <Text style={styles.summaryLabel}>{t('productsStats_materials')}</Text>
                        <Text style={styles.summaryValue}>{statistics.length}</Text>
                    </View>

                    <View style={styles.summaryCard}>
                        <View style={[styles.iconCircle, styles.iconAccent]}>
                            <Ionicons name="bar-chart" size={18} color="#fff"/>
                        </View>
                        <Text style={styles.summaryLabel}>{t('productsStats_usage')}</Text>
                        <Text
                            style={styles.summaryValue}>{statistics.reduce((s: number, it: any) => s + (it.usageCount || 0), 0)}</Text>
                        <Text style={styles.summaryMoney}>{formatMoney(totalUsedMoney)}</Text>
                    </View>

                    <View style={styles.summaryCard}>
                        <View style={[styles.iconCircle, styles.iconGreen]}>
                            <Ionicons name="add-circle" size={18} color="#fff"/>
                        </View>
                        <Text style={styles.summaryLabel}>{t('productsStats_additions')}</Text>
                        <Text
                            style={styles.summaryValue}>{statistics.reduce((s: number, it: any) => s + (it.additionCount || 0), 0)}</Text>
                        <Text style={styles.summaryMoney}>{formatMoney(totalAddedMoney)}</Text>
                    </View>
                </View>
            )}
        </>
    );

    const renderEmpty = () => {
        if (isLoading) return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#ff7e5f"/>
            </View>
        );

        if (error) return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={refetch} style={styles.retryButton}>
                    <Text style={styles.retryText}>{t('productsStats_retry')}</Text>
                </TouchableOpacity>
            </View>
        );

        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>{t('productsStats_noDataThisMonth')}</Text>
            </View>
        );
    };

    return (
        <Animated.View style={[containerStyle, {opacity: fadeAnim}] as any}>
            {/* Use FlatList as the main scroll container and inject header + summary as list header */}
            <FlatList
                data={statistics || []}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={styles.listContent}
                refreshing={refreshing}
                onRefresh={onRefresh}
                showsVerticalScrollIndicator={false}
            />

            {/* Material logs modal (modern bottom-sheet style) */}
            <Modal visible={logsModalVisible} animationType="slide" transparent={true}
                   onRequestClose={closeMaterialLogs}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* draggable handle */}
                        <View style={styles.handleContainer}>
                            <View style={styles.handle}/>
                        </View>

                        {/* header with gradient and icon */}
                        <LinearGradient colors={['#667eea', '#9f7aea']} style={styles.modalHeaderGradient}>
                            <View style={styles.modalHeaderInner}>
                                <View style={styles.headerIconWrap}>
                                    <Ionicons name="analytics" size={20} color="#fff"/>
                                </View>
                                <Text
                                    style={styles.modalTitle}>{selectedMaterialName || t('productsStats_materialsLogTitle')}{materialLogs.length ? ` (${materialLogs.length})` : ''}</Text>
                                <TouchableOpacity onPress={closeMaterialLogs} style={styles.modalCloseButton}>
                                    <Ionicons name="close" size={18} color="#fff"/>
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>

                        {/* content area */}
                        <View style={styles.modalBody}>
                            {logsLoading ? (
                                <View style={styles.modalLoading}>
                                    <ActivityIndicator size="large" color="#9f7aea"/>
                                </View>
                            ) : logsError ? (
                                <View style={styles.modalError}>
                                    <Text style={styles.errorText}>{logsError}</Text>
                                    <TouchableOpacity onPress={() => fetchMaterialLogs(selectedMaterialId ?? undefined)}
                                                      style={styles.retryButton}>
                                        <Text style={styles.retryText}>{t('productsStats_retry')}</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : materialLogs.length === 0 ? (
                                <View style={styles.modalEmpty}>
                                    <Text style={styles.emptyText}>لا توجد سجلات لهذه المادة</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={materialLogs}
                                    keyExtractor={(it, idx) => `${selectedMaterialId ?? selectedMaterialName}-${idx}`}
                                    style={{flex: 1}}
                                    contentContainerStyle={styles.logsList}
                                    nestedScrollEnabled={true}
                                    keyboardShouldPersistTaps="handled"
                                    renderItem={({item}) => (
                                        <View style={styles.logCard}>
                                            <View style={styles.logCardRow}>
                                                <View style={styles.dateBadge}>
                                                    <Text
                                                        style={styles.dateBadgeText}>{`${item.date.day} ${item.date.time}`}</Text>
                                                </View>
                                                <View style={styles.logMain}>
                                                    <Text style={styles.logEmployee}>{item.employeeName || '-'}</Text>
                                                </View>
                                                <View style={styles.logMeta}>
                                                    <View
                                                        style={[styles.qtyPill, item.type && item.type.toLowerCase().includes('add') ? styles.qtyAdd : styles.qtyUse]}>
                                                        <Text style={styles.qtyPillText}>{item.quantity}</Text>
                                                    </View>
                                                    <Text
                                                        style={styles.logTypeLabel}>{(item.type && (item.type.toLowerCase().includes('add') ? t('productsStats_typeAdded') : t('productsStats_typeUsed')))}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    )}
                                />
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    summaryRowOuter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        gap: 12,
        flexWrap: 'wrap',
    },
    summaryCard: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 14,
        paddingVertical: 6,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: 'rgba(0,0,0,0.12)',
        shadowOffset: {width: 0, height: 6},
        shadowOpacity: 0.12,
        shadowRadius: 12,

    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    iconPrimary: {
        backgroundColor: '#4facfe',
    },
    iconAccent: {
        backgroundColor: '#ff7e5f',
    },
    iconGreen: {
        backgroundColor: '#34c759',
    },
    summaryLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: '900',
        marginTop: 6,
        color: '#111',
    },
    summaryMoney: {
        marginTop: 6,
        fontSize: 13,
        color: '#444',
        fontWeight: '800',
    },
    listContent: {
        padding: 16,
        paddingTop: 12,
        paddingBottom: 24,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 14,
        marginBottom: 12,
        elevation: 3,
        overflow: 'hidden',
    },
    cardInner: {
        padding: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    materialName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#333',
        textAlign: 'center',
        flex: 1,
    },
    badge: {
        backgroundColor: '#ff7e5f',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    badgeText: {
        color: '#fff',
        fontWeight: '700',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statItemRight: {
        alignItems: 'center',
        flex: 1,
    },
    statLabel: {
        fontSize: 12,
        color: '#777',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '800',
        marginTop: 4,
    },
    statCount: {
        fontSize: 11,
        color: '#999',
        marginTop: 4,
    },
    usedValue: {
        color: '#ff6b6b',
    },
    addedValue: {
        color: '#28c76f',
    },
    positiveValue: {
        color: '#28c76f',
    },
    negativeValue: {
        color: '#ff6b6b',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    footerButton: {
        backgroundColor: '#667eea',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    footerButtonText: {
        color: '#fff',
        fontWeight: '700',
        marginLeft: 8,
    },
    footerGhost: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    footerGhostText: {
        color: '#666',
        fontWeight: '700',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#FF3B30',
        textAlign: 'center',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    moneyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        gap: 8,
    },
    moneyBlock: {
        flex: 1,
        alignItems: 'center',
    },
    moneyLabel: {
        fontSize: 11,
        color: '#666',
    },
    moneyValue: {
        fontSize: 14,
        fontWeight: '800',
        marginTop: 4,
        color: '#222',
    },
    expandedDetails: {
        marginTop: 12,
        padding: 12,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 10,
    },
    expandedText: {
        fontSize: 13,
        color: '#444',
        marginBottom: 6,
    },

    // modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
        padding: 0,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        height: '85%',
        overflow: 'hidden',
    },
    modalHeaderGradient: {
        paddingTop: 12,
        paddingBottom: 8,
        paddingHorizontal: 16,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        elevation: 4,
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    modalHeaderInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    headerIconWrap: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    modalTitle: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 16,
        flex: 1,
        textAlign: 'center',
    },
    modalCloseButton: {
        padding: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    handleContainer: {
        alignItems: 'center',
        paddingTop: 8,
        paddingBottom: 4,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#ccc',
        marginBottom: 8,
    },
    modalBody: {
        padding: 16,
        flex: 1,
    },
    modalLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalError: {
        padding: 20,
        alignItems: 'center',
    },
    modalEmpty: {
        padding: 20,
        alignItems: 'center',
    },
    logsList: {
        paddingBottom: 16,
        flexGrow: 1,
    },
    logCard: {
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        elevation: 2,
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    logCardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateBadge: {
        backgroundColor: '#667eea',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
    },
    dateBadgeText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 12,
    },
    logMain: {},
    logEmployee: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    logRawText: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    logMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    qtyPill: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    qtyAdd: {
        backgroundColor: '#28c76f',
    },
    qtyUse: {
        backgroundColor: '#ff6b6b',
    },
    qtyPillText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 12,
    },
    logTypeLabel: {
        fontSize: 12,
        color: '#333',
        fontWeight: '500',
    },
});
