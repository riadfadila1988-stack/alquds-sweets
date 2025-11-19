import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, RefreshControl, Animated, Dimensions, ScrollView } from 'react-native';
import { useTaskGroups } from '@/hooks/use-task-groups';
import { useTranslation } from './_i18n';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ScreenTemplate } from '@/components/ScreenTemplate';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';

// Accent gradients constant (stable reference)
const ACCENT_GRADIENTS: [string, string][] = [
  ['#ff6a88', '#ff99ac'],
  ['#84fab0', '#8fd3f4'],
  ['#a18cd1', '#fbc2eb'],
  ['#f6d365', '#fda085'],
  ['#fccb90', '#d57eeb'],
  ['#5ee7df', '#b490ca'],
];

// Deterministic hash for pseudo-random layout choices
function hashCode(str: string) {
  let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

export default function TaskGroupsScreen() {
  const { t } = useTranslation();
  const { taskGroups, isLoading, error, remove } = useTaskGroups();
  const router = useRouter();
  const params = useLocalSearchParams();
  const headerColor1 = (params.headerColor1 as string) || '#fa709a';
  const headerColor2 = (params.headerColor2 as string) || '#fee140';
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  // Dimensions (static for now; could add orientation listener for dynamic updates)
  const screenWidth = Dimensions.get('window').width;
  const horizontalPadding = 16;
  const contentWidth = screenWidth - horizontalPadding * 2;

  // Shimmer animation for skeleton loader
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isLoading) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, { toValue: 1, duration: 1100, useNativeDriver: true }),
          Animated.timing(shimmerAnim, { toValue: 0, duration: 1100, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isLoading, shimmerAnim]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['taskGroups'] });
    } finally {
      setRefreshing(false);
    }
  };

  const confirmDelete = (id: string, name?: string) => {
    Alert.alert(
      t('delete') || 'Delete',
      (t('deleteConfirm') || 'Are you sure you want to delete this item?') + (name ? `\n${name}` : ''),
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        { text: t('delete') || 'Delete', style: 'destructive', onPress: async () => { await remove(id); } },
      ]
    );
  };

  // Shuffle for random ordering (deterministic-ish but visually varied)
  const shuffledTaskGroups = useMemo(() => {
    if (!taskGroups) return [] as any[];
    const arr = [...taskGroups];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(((i + 31) * 9973) % (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [taskGroups]);

  // Build scattered masonry-like layout
  const scatter = useMemo(() => {
    if (!shuffledTaskGroups.length) return { items: [], height: 0 } as { items: any[]; height: number };
    const cols = contentWidth > 900 ? 4 : contentWidth > 600 ? 3 : 2;
    const colWidth = (contentWidth - (cols - 1) * 12) / cols; // gutter 12
    const heights = Array(cols).fill(0);
    const items: any[] = [];
    shuffledTaskGroups.forEach((tg: any, idx: number) => {
      const seed = hashCode(String(tg._id ?? idx));
      // choose column with min height
      let col = 0; let minH = heights[0];
      for (let c = 1; c < cols; c++) { if (heights[c] < minH) { minH = heights[c]; col = c; } }
      const hRand = (seed % 1000) / 1000; // 0..1
      const height = 120 + Math.round(hRand * 160); // 120-280
      let span = 1;
      if (cols > 2 && (seed % 7 === 0) && col < cols - 1) span = 2;
      const width = span * colWidth + (span - 1) * 12;
      const x = col * (colWidth + 12);
      const y = heights[col];
      heights[col] += height + 12;
      if (span === 2) heights[col + 1] = heights[col]; // keep rows even when spanning
      const grad = ACCENT_GRADIENTS[idx % ACCENT_GRADIENTS.length];
      const rotateDeg = ((seed % 9) - 4) * 0.6; // -2.4..2.4deg
      const borderRadius = 18 + (seed % 6) * 2; // 18..28
      items.push({
        key: tg._id,
        tg,
        style: { position: 'absolute', left: x, top: y, width, height, transform: [{ rotate: rotateDeg + 'deg' }] },
        visual: { grad, borderRadius }
      });
    });
    return { items, height: Math.max(...heights) };
  }, [shuffledTaskGroups, contentWidth]);

  const EmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🎯</Text>
      <Text style={styles.emptyTitle}>{t('noTaskGroups') || 'No task groups yet'}</Text>
      <Text style={styles.emptySubtitle}>{t('tapPlusToAdd') || 'Tap the + button to create your first group.'}</Text>
      <TouchableOpacity style={styles.emptyActionBtn} onPress={() => router.push('/task-groups/new')}>
        <MaterialIcons name="add-circle" size={22} color="#fff" />
        <Text style={styles.emptyActionText}>{t('addTaskGroup') || 'Add Task Group'}</Text>
      </TouchableOpacity>
    </View>
  );

  const ErrorComponent = () => (
    <View style={styles.errorContainer}>
      <MaterialIcons name="error-outline" size={42} color="#dc2626" />
      <Text style={styles.errorTitle}>{t('error') || 'Error'}</Text>
      <Text style={styles.errorMsg}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
        <MaterialIcons name="refresh" size={20} color="#fff" />
        <Text style={styles.retryText}>{t('retry') || 'Retry'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setShowErrorDetails(v => !v)}>
        <Text style={styles.toggleErrorDetails}>{showErrorDetails ? (t('hideDetails') || 'Hide details') : (t('showDetails') || 'Show details')}</Text>
      </TouchableOpacity>
      {showErrorDetails && <Text style={styles.errorDetails}>{error}</Text>}
    </View>
  );

  return (
    <ScreenTemplate
      title={t('taskGroups') || 'Task Groups'}
      showBackButton={true}
      showAddButton={true}
      onAddPress={() => router.push('/task-groups/new')}
      headerGradient={[headerColor1, headerColor2, '#fee140'] as any}
      fabColor={headerColor1}
    >
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.skeletonList}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Animated.View key={i} style={[styles.skelCard, { opacity: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) }]}>
                <View style={styles.skelAvatar} />
                <View style={styles.skelLine} />
                <View style={[styles.skelLine, { width: '55%' }]} />
              </Animated.View>
            ))}
          </View>
        ) : error ? (
          <ErrorComponent />
        ) : scatter.items.length === 0 ? (
          <EmptyComponent />
        ) : (
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={headerColor1} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 140 }}
          >
            <View style={[styles.scatterContainer, { height: scatter.height }]}>
              {scatter.items.map(({ tg, key, style, visual }: any) => (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.85}
                  onPress={() => router.push(`./task-groups/${tg._id}`)}
                  onLongPress={() => confirmDelete(tg._id, tg.name)}
                  style={style}
                >
                  <LinearGradient colors={visual.grad} style={[styles.scatterGradient, { borderRadius: visual.borderRadius }]}>
                    <View style={[styles.scatterInner, { borderRadius: visual.borderRadius - 4 }]}>
                      <Text style={styles.scatterTitle} numberOfLines={3}>{tg.name}</Text>
                      <View style={styles.scatterFooterRow}>
                        <Text style={styles.scatterMeta}>{t('open') || 'Open'}</Text>
                        <TouchableOpacity onPress={() => confirmDelete(tg._id, tg.name)} style={styles.scatterDeleteBtn}>
                          <MaterialIcons name="delete" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </ScreenTemplate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f1f5f9' },
  skeletonList: { marginTop: 8 },
  skelCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#e2e8f0', borderRadius: 18, marginBottom: 12 },
  skelAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#cbd5e1', marginRight: 12 },
  skelLine: { height: 12, backgroundColor: '#cbd5e1', borderRadius: 6, flex: 1 },
  emptyContainer: { alignItems: 'center', paddingHorizontal: 24, marginTop: 40 },
  emptyEmoji: { fontSize: 64, marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  emptySubtitle: { fontSize: 14, color: '#475569', marginTop: 4, textAlign: 'center' },
  emptyActionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6366f1', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, marginTop: 16, gap: 8 },
  emptyActionText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  errorContainer: { alignItems: 'center', padding: 24 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#dc2626', marginTop: 8 },
  errorMsg: { fontSize: 14, color: '#7f1d1d', marginTop: 4, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dc2626', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, marginTop: 16, gap: 8 },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  toggleErrorDetails: { marginTop: 12, color: '#2563eb', fontSize: 14, textDecorationLine: 'underline' },
  errorDetails: { marginTop: 8, fontSize: 12, color: '#334155' },
  scatterContainer: { position: 'relative' },
  scatterGradient: { flex: 1, padding: 4 },
  scatterInner: { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', padding: 12 },
  scatterTitle: { fontSize: 23, fontWeight: '700', color: '#fff', marginBottom: 8 },
  scatterFooterRow: { position: 'absolute', left: 12, right: 12, bottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scatterMeta: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  scatterDeleteBtn: { backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
});
