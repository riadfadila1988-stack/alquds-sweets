import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, I18nManager } from 'react-native';
import { IMaterial } from '@/types/material';
import { useTranslation } from '@/app/_i18n';

export default function MaterialListItem({ item, onPress, onLongPress }: { item: IMaterial; onPress?: () => void; onLongPress?: () => void }) {
  const { t } = useTranslation();
  const isLow = typeof item.quantity === 'number' && typeof item.notificationThreshold === 'number' && item.quantity <= item.notificationThreshold;
  const unitLabel = item.unit ? (t(('unit_' + item.unit) as any) ?? item.unit) : '';

  const costLabel = typeof item.cost === 'number' ? Number(item.cost).toFixed(2) : undefined;
  const minQtyLabel = typeof item.notificationThreshold === 'number' ? String(item.notificationThreshold) : undefined;
  const createdLabel = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : undefined;

  // detect RTL from react-native
  const isRTL = I18nManager.isRTL;

  // dynamic styles that depend on RTL
  // Always render with the side (quantity+badge) on the left and main content (name) on the right
  const rowStyle = [styles.row, styles.rowReverse];
  const badgeStyle = [styles.badge];
  const nameTextStyle = [styles.name, styles.textRight];
  const infoRowStyle = [styles.infoRow];

  // Build the displayed name (always show primary name first, then heName)
  const displayedName = `${item.name}${item.heName ? ' | ' + item.heName : ''}`;

  return (
    <TouchableOpacity style={rowStyle} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.7}>
      {/* Main content: name and secondary info */}
      <View style={styles.content}>
        <Text style={nameTextStyle}>{displayedName}</Text>

        {/* Secondary info row: min quantity, cost, created date */}
        <View style={infoRowStyle}>
          {minQtyLabel ? <Text style={styles.infoText}>{`${t('minQuantity')}: ${minQtyLabel}`}</Text> : null}
          {costLabel ? <Text style={styles.infoText}>{`${t('cost')}: ${costLabel}`}</Text> : null}
          {createdLabel ? <Text style={styles.infoText}>{createdLabel}</Text> : null}
        </View>
      </View>

      {/* Side content: quantity and badge (mirrored when RTL) */}
      <View style={styles.side}>
        {(item.quantity !== undefined || item.unit) && (
          <Text style={[styles.quantity, isRTL ? styles.textRight : null]}>{`${item.quantity ?? ''}${unitLabel ? ' ' + unitLabel : ''}`}</Text>
        )}

        {isLow && (
          <View style={badgeStyle}>
            <Text style={styles.badgeText}>{t('low')}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { padding: 12, backgroundColor: '#fff', borderRadius: 8, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', flexDirection: 'row', alignItems: 'center' },
  // We reuse rowReverse to place the side container on the left and content on the right
  rowReverse: { flexDirection: 'row-reverse' },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { marginTop: 6, color: '#666' },
  infoRow: { flexDirection: 'row', marginTop: 6, flexWrap: 'wrap' },
  infoText: { color: '#777', marginRight: 12, fontSize: 13 },
  // main content takes remaining space
  content: { flex: 1 },
  // side container for quantity and badge
  side: { justifyContent: 'center', alignItems: 'flex-start', marginRight: 12 },
  quantity: { fontSize: 16, fontWeight: '600', color: '#333' },
  badge: { backgroundColor: '#FF3B30', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginTop: 6 },
  badgeText: { color: '#fff', fontWeight: '700' },
  // helper for text alignment in RTL
  textRight: { textAlign: 'right' },
});
