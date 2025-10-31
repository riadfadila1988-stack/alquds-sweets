import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Pressable, TextInput, ScrollView } from 'react-native';
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
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => cursor.y);
  const [pickerMonth, setPickerMonth] = useState(() => cursor.m);

  const { data, isLoading, error } = useEmployeesHours(cursor.y, cursor.m);
  const title = t('employeesHoursTitle');

  const monthLabel = `${cursor.y}-${String(cursor.m).padStart(2, '0')}`;
  // compute number of days in the selected month (cursor.m is 1-based)
  const daysInMonth = new Date(cursor.y, cursor.m, 0).getDate();

  const isRTL = true;
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const maxPastYears = 10; // show past 10 years + current year

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
        <TouchableOpacity
          onPress={() => {
            // initialize picker values from current cursor
            setPickerYear(cursor.y);
            setPickerMonth(cursor.m);
            setPickerVisible(true);
          }}
          style={styles.monthTouchable}
        >
          <Text style={styles.monthText}>{monthLabel}</Text>
        </TouchableOpacity>
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

      {/* Month picker modal */}
      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPickerVisible(false)} />
        <View style={styles.modalContent}>
          <View style={styles.pickerHeader}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>{t('selectMonth') || 'Select month'}</Text>
            <TextInput
              value={String(pickerYear)}
              onChangeText={(v) => {
                const raw = Number(v.replace(/[^0-9]/g, ''));
                if (!raw) {
                  // fallback to cursor year when input cleared
                  setPickerYear(cursor.y);
                } else {
                  // clamp to not allow future years
                  setPickerYear(Math.min(raw, currentYear));
                }
              }}
              keyboardType="number-pad"
              style={styles.yearInput}
              placeholder={String(cursor.y)}
            />
          </View>
          {/* Year selector (choose from a range) */}
          <ScrollView horizontal contentContainerStyle={{ paddingVertical: 6, paddingHorizontal: 4 }} showsHorizontalScrollIndicator={false}>
            {Array.from({ length: maxPastYears + 1 }).map((_, i) => {
              // render only past years up to the current year
              const y = currentYear - maxPastYears + i;
              const selectedY = y === pickerYear;
              return (
                <Pressable
                  key={y}
                  style={[styles.yearItem, selectedY && styles.yearItemSelected]}
                  onPress={() => setPickerYear(y)}
                >
                  <Text style={styles.yearItemText}>{String(y)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
           <ScrollView contentContainerStyle={styles.monthGrid}>
            {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, idx) => {
              const mm = idx + 1;
              const selected = mm === pickerMonth;
              // disable months in the future when the chosen year is the current year
              const isFutureMonth = (pickerYear || cursor.y) === currentYear && mm > currentMonth;
              return (
                <Pressable
                  key={m}
                  style={[styles.monthItem, selected && styles.monthItemSelected, isFutureMonth && styles.monthItemDisabled]}
                  onPress={() => {
                    if (isFutureMonth) return; // ignore presses for future months
                    setPickerMonth(mm);
                  }}
                >
                  <Text style={[styles.monthItemText, isFutureMonth && styles.monthItemTextDisabled]}>{`${pickerYear || cursor.y}-${m}`}</Text>
                </Pressable>
              );
            })}
           </ScrollView>
           <View style={styles.pickerButtons}>
             <TouchableOpacity onPress={() => setPickerVisible(false)} style={styles.navBtn}>
               <Text style={styles.navText}>{t('cancel') || 'Cancel'}</Text>
             </TouchableOpacity>
             <TouchableOpacity
               onPress={() => {
                const y = pickerYear || cursor.y;
                let m = pickerMonth || cursor.m;
                // Safety: if user somehow has a future month selected, clamp to currentMonth when applying current year
                if (y === currentYear && m > currentMonth) {
                  m = currentMonth;
                }
                setCursor({ y, m });
                setPickerVisible(false);
               }}
               style={[styles.navBtn, { marginLeft: 8 }]}
             >
               <Text style={styles.navText}>{t('ok') || 'OK'}</Text>
             </TouchableOpacity>
           </View>
         </View>
       </Modal>

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
                style={[styles.row, isRTL && styles.rowRtl]}
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
                <Text style={[styles.empHours, isRTL && { textAlign: 'right' }]}>{formatHM(item.totalMinutes)}</Text>
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
  monthTouchable: { paddingHorizontal: 8, paddingVertical: 6 },
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
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { marginHorizontal: 24, marginTop: '30%', backgroundColor: '#fff', borderRadius: 8, padding: 12, elevation: 4, maxHeight: '50%' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  yearInput: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#ccc', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6, minWidth: 80, textAlign: 'center' },
  yearItem: { paddingHorizontal: 10, paddingVertical: 6, marginHorizontal: 4, borderRadius: 6, backgroundColor: '#f8f8f8' },
  yearItemSelected: { backgroundColor: '#ddeeff' },
  yearItemText: { fontSize: 14 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  monthItem: { width: '30%', paddingVertical: 10, paddingHorizontal: 6, marginBottom: 8, alignItems: 'center', borderRadius: 6, borderWidth: 1, borderColor: 'transparent' },
  monthItemSelected: { backgroundColor: '#eef', borderColor: '#99c' },
  monthItemText: { fontSize: 14 },
  pickerButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  monthItemDisabled: { opacity: 0.5 },
  monthItemTextDisabled: { color: '#999' },
});
