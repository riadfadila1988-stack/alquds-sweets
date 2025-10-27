import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from './_i18n';
import { useEmployeesHours } from '@/hooks/use-employees-hours';
import { formatHM } from '@/utils/date';
import Header from './components/header';

export default function EmployeesHoursScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() + 1 };
  });

  const { data, isLoading, error } = useEmployeesHours(cursor.y, cursor.m);
  const title = t('employeesHoursTitle');

  const monthLabel = `${cursor.y}-${String(cursor.m).padStart(2, '0')}`;
  // compute number of days in the selected month (cursor.m is 1-based)
  const daysInMonth = new Date(cursor.y, cursor.m, 0).getDate();

  const isRTL = I18nManager.isRTL;

  return (
    <View style={styles.container}>
      <Header title={title} />

      <View style={[styles.monthBar, isRTL && styles.monthBarRtl]}>
        <TouchableOpacity
          onPress={() => {
            const d = new Date(cursor.y, cursor.m - 2, 1);
            setCursor({ y: d.getFullYear(), m: d.getMonth() + 1 });
          }}
          style={styles.navBtn}
        >
          <Text style={styles.navText}>{t('prevMonth')}</Text>
        </TouchableOpacity>
        <Text style={styles.monthText}>{monthLabel}</Text>
        <TouchableOpacity
          onPress={() => {
            const d = new Date(cursor.y, cursor.m, 1);
            setCursor({ y: d.getFullYear(), m: d.getMonth() + 1 });
          }}
          style={styles.navBtn}
        >
          <Text style={styles.navText}>{t('nextMonth')}</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.employee._id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            return (
              <TouchableOpacity
                style={[styles.row, styles.rowRtl]}
                onPress={() =>
                  router.push({
                    pathname: '/employees-hours/[id]',
                    params: { id: item.employee._id, y: String(cursor.y), m: String(cursor.m), name: item.employee.name },
                  })
                }
              >
                <View style={styles.rowLeft}>
                  <Text style={[styles.empName, isRTL && { textAlign: 'right' }]}>{item.employee.name}</Text>
                  <Text style={[styles.empDays, isRTL && { textAlign: 'right' }]}>{`${t('worked') || 'Worked'} ${item.totalDays ?? 0} ${t('of') || 'of'} ${daysInMonth} ${t('days') || 'days'}`}</Text>
                </View>
                <Text style={[styles.empHours, isRTL && { textAlign: 'left' }]}>{formatHM(item.totalMinutes)}</Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('noEmployeesData')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  monthBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  monthBarRtl: { flexDirection: 'row-reverse' },
  monthText: { fontSize: 16, fontWeight: '500' },
  navBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#f0f0f0', borderRadius: 6 },
  navText: { fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff', marginBottom: 8, elevation: 1 },
  rowRtl: { flexDirection: 'row-reverse' },
  rowLeft: { flexDirection: 'column' },
  empName: { fontSize: 16, fontWeight: '500' },
  empDays: { fontSize: 13, color: '#666', marginTop: 4 },
  empHours: { fontSize: 16, color: '#444' },
  empty: { marginTop: 40, alignItems: 'center' },
  emptyText: { color: '#666' },
  errorText: { color: 'red', textAlign: 'center', marginTop: 20 },
});
