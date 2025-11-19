import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    Pressable,
    TextInput,
    ScrollView,
    Animated,
    ColorValue
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from './_i18n';
import { useEmployeesHours } from '@/hooks/use-employees-hours';
import { formatHM } from '@/utils/date';
import { ScreenTemplate } from '@/components/ScreenTemplate';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Animated Employee Card Component
interface EmployeeCardProps {
  item: any;
  index: number;
  cursor: { y: number; m: number };
  router: any;
  t: (k: string) => string;
  daysInMonth: number;
  isRTL: boolean;
  headerColors: readonly [ColorValue, ColorValue, ...ColorValue[]]
}
const AnimatedEmployeeCard = ({ item, index, cursor, router, t, daysInMonth, isRTL, headerColors }: EmployeeCardProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  // Press scale animation
  const scaleAnim = useRef(new Animated.Value(1)).current;
  // Celebration pulse for 100% progress
  const celebrateScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const progressPercentage = ((item.totalDays ?? 0) / daysInMonth) * 100;

  useEffect(() => {
    if (progressPercentage >= 100) {
      // small celebratory pulse
      celebrateScale.setValue(0);
      Animated.sequence([
        Animated.timing(celebrateScale, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(celebrateScale, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    }
  }, [progressPercentage, celebrateScale]);

  const onPressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const onPressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() =>
          router.push({
            pathname: '/employees-hours/[id]',
            params: { id: item.employee._id, y: String(cursor.y), m: String(cursor.m), name: item.employee.name },
          })
        }
        android_ripple={{ color: '#00000010' }}
        style={{ borderRadius: 16 }}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <LinearGradient
            colors={['#ffffff', '#f0fdf4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.employeeCard}
          >
            <View style={[styles.cardHeader, isRTL && styles.cardHeaderRTL]}>
              <View style={[styles.avatarContainer, isRTL && styles.avatarContainerRTL]}>
                <LinearGradient
                  colors={headerColors}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>
                    {item.employee.name.charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
              </View>
              <View style={styles.employeeInfo}>
                <Text style={[styles.employeeName, isRTL && styles.textRTL]}>{item.employee.name}</Text>
                <View style={[styles.statsRow, isRTL && styles.statsRowRTL]}>
                  <Ionicons name="calendar" size={14} color="#666" />
                  <Text style={[styles.daysText, isRTL && styles.textRTL]}>
                    {item.totalDays ?? 0} / {daysInMonth} {t('days') || 'days'}
                  </Text>
                </View>
              </View>
              <View style={[styles.hoursContainer, isRTL && styles.hoursContainerRTL]}>
                <Text style={[styles.hoursLabel, isRTL && styles.textRTL]}>{t('totalHours') || 'Total'}</Text>
                <Text style={[styles.hoursValue, isRTL && styles.textRTL, {color: headerColors[0]}]}>{formatHM(item.totalMinutes)}</Text>
              </View>
              {/* small celebration when complete */}
              {progressPercentage >= 100 && (
                <Animated.View style={[styles.celebrateBadge, { transform: [{ scale: celebrateScale.interpolate({ inputRange: [0,1], outputRange: [0.8, 1.2] }) }] }]}>
                  <Text style={styles.celebrateEmoji}>🎉</Text>
                </Animated.View>
              )}
            </View>

            {/* Progress Bar */}
            <View style={[styles.progressContainer, isRTL && styles.progressContainerRTL]}>
              <View style={[styles.progressBarBg, isRTL && styles.progressBarBgRTL]}>
                <LinearGradient
                  colors={headerColors}
                  start={{ x: isRTL ? 1 : 0, y: 0 }}
                  end={{ x: isRTL ? 0 : 1, y: 0 }}
                  style={[styles.progressBarFill, isRTL && styles.progressBarFillRTL, { width: `${progressPercentage}%` }]}
                />
              </View>
              <Text style={[styles.progressText, isRTL && styles.progressTextRTL, {color: headerColors[0]}]}>{progressPercentage.toFixed(0)}%</Text>
            </View>

          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

export default function EmployeesHoursScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const headerColor1 = (params.headerColor1 as string) || '#f093fb';
  const headerColor2 = (params.headerColor2 as string) || '#f5576c';

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() + 1 };
  });
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => cursor.y);
  const [pickerMonth, setPickerMonth] = useState(() => cursor.m);

  const { data, isLoading, error } = useEmployeesHours(cursor.y, cursor.m);
  const title = t('employeesHoursTitle');

  // Month-picker helpers
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const maxPastYears = 10; // show past 10 years + current year

  const monthLabel = `${cursor.y}-${String(cursor.m).padStart(2, '0')}`;
  // compute number of days in the selected month (cursor.m is 1-based)
  const daysInMonth = new Date(cursor.y, cursor.m, 0).getDate();

  const isRTL = true;
  // fun floating emojis in background
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;
  const float3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const mkFloat = (v: Animated.Value, distance: number, delay = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: -distance, duration: 2000, delay, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
    mkFloat(float1, 14, 0);
    mkFloat(float2, 20, 400);
    mkFloat(float3, 10, 800);
  }, [float1, float2, float3]);

  // bouncy loading icon
  const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -8, duration: 400, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    ).start();
  }, [bounce]);

  return (
    <ScreenTemplate
      title={title}
      showBackButton={true}
      headerGradient={[headerColor1, headerColor2, '#f5576c'] as any}
    >
      <View style={styles.container}>
        {/* Floating fun emojis */}
        <Animated.View style={[styles.floatingEmoji, { top: 8, left: 12, transform: [{ translateY: float1 }] }]}>
          <Text style={styles.floatingEmojiText}>✨</Text>
        </Animated.View>
        <Animated.View style={[styles.floatingEmoji, { top: 120, right: 18, transform: [{ translateY: float2 }] }]}>
          <Text style={styles.floatingEmojiText}>⭐</Text>
        </Animated.View>
        <Animated.View style={[styles.floatingEmoji, { top: 60, right: 70, transform: [{ translateY: float3 }] }]}>
          <Text style={styles.floatingEmojiText}>🎈</Text>
        </Animated.View>

        {/* Premium Month Selector */}
        <LinearGradient
          colors={[headerColor1, headerColor2, '#f5576c']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.monthBar}
        >
          <TouchableOpacity
            onPress={() => {
              const d = new Date(cursor.y, cursor.m - 2, 1);
              setCursor({ y: d.getFullYear(), m: d.getMonth() + 1 });
            }}
            style={styles.navBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setPickerYear(cursor.y);
              setPickerMonth(cursor.m);
              setPickerVisible(true);
            }}
            style={styles.monthTouchable}
            activeOpacity={0.7}
          >
            <View style={styles.monthDateContainerWrapper}>
              <View style={[styles.monthDateContainer, isRTL && styles.monthDateContainerRTL]}>
                <Ionicons name="calendar-outline" size={20} color="#fff" style={isRTL ? { marginLeft: 8 } : { marginRight: 8 }} />
                <Text style={styles.monthText}>{monthLabel}</Text>
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              const d = new Date(cursor.y, cursor.m, 1);
              setCursor({ y: d.getFullYear(), m: d.getMonth() + 1 });
            }}
            style={styles.navBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Premium Month Picker Modal */}
        <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setPickerVisible(false)} />
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#02632D', '#048B3D', '#06A34E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.pickerHeader}
            >
              <Text style={styles.pickerHeaderText}>{t('selectMonth') || 'Select Month'}</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            {/* Year Input */}
            <View style={styles.yearInputContainer}>
              <Text style={styles.yearLabel}>{t('year') || 'Year'}</Text>
              <TextInput
                value={String(pickerYear)}
                onChangeText={(v) => {
                  const raw = Number(v.replace(/[^0-9]/g, ''));
                  if (!raw) {
                    setPickerYear(cursor.y);
                  } else {
                    setPickerYear(Math.min(raw, currentYear));
                  }
                }}
                keyboardType="number-pad"
                style={styles.yearInput}
                placeholder={String(cursor.y)}
              />
            </View>

            {/* Year Selector */}
            <ScrollView
              horizontal
              contentContainerStyle={styles.yearScroll}
              showsHorizontalScrollIndicator={false}
            >
              {Array.from({ length: maxPastYears + 1 }).map((_, i) => {
                const y = currentYear - maxPastYears + i;
                const selectedY = y === pickerYear;
                return (
                  <Pressable
                    key={y}
                    style={[styles.yearItem, selectedY && styles.yearItemSelected]}
                    onPress={() => setPickerYear(y)}
                  >
                    <Text style={[styles.yearItemText, selectedY && styles.yearItemTextSelected]}>
                      {String(y)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Month Grid */}
            <ScrollView contentContainerStyle={styles.monthGrid}>
              {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, idx) => {
                const mm = idx + 1;
                const selected = mm === pickerMonth;
                const isFutureMonth = (pickerYear || cursor.y) === currentYear && mm > currentMonth;
                return (
                  <Pressable
                    key={m}
                    style={[
                      styles.monthItem,
                      selected && styles.monthItemSelected,
                      isFutureMonth && styles.monthItemDisabled
                    ]}
                    onPress={() => {
                      if (isFutureMonth) return;
                      setPickerMonth(mm);
                    }}
                  >
                    <LinearGradient
                      colors={selected ? ['#02632D', '#06A34E'] : ['#f8f8f8', '#f8f8f8']}
                      style={styles.monthItemGradient}
                    >
                      <Text style={[
                        styles.monthItemText,
                        selected && styles.monthItemTextSelected,
                        isFutureMonth && styles.monthItemTextDisabled
                      ]}>
                        {`${pickerYear || cursor.y}-${m}`}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.pickerButtons}>
              <TouchableOpacity
                onPress={() => setPickerVisible(false)}
                style={styles.cancelBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>{t('cancel') || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const y = pickerYear || cursor.y;
                  let m = pickerMonth || cursor.m;
                  if (y === currentYear && m > currentMonth) {
                    m = currentMonth;
                  }
                  setCursor({ y, m });
                  setPickerVisible(false);
                }}
                style={styles.okBtn}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#02632D', '#06A34E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.okBtnGradient}
                >
                  <Text style={styles.okBtnText}>{t('ok') || 'OK'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Animated.View style={{ transform: [{ translateY: bounce }] }}>
              <ActivityIndicator size="large" color="#02632D" />
            </Animated.View>
            <Text style={styles.loadingText}>{t('loading') || 'Loading...'} ✨</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={64} color="#ff6b6b" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.employee._id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => (
              <AnimatedEmployeeCard
                item={item}
                index={index}
                cursor={cursor}
                router={router}
                t={t}
                daysInMonth={daysInMonth}
                isRTL={isRTL}
                headerColors={[headerColor1, headerColor2, '#f5576c']}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Animated.Text style={[styles.emptyEmoji, { transform: [{ translateY: bounce }] }]}>😴</Animated.Text>
                <Text style={styles.emptyText}>{t('noEmployeesData') || 'No employees data'}</Text>
                <Text style={styles.emptySubtext}>{t('selectDifferentMonth') || 'Try selecting a different month'}</Text>
              </View>
            }
          />
        )}
      </View>
    </ScreenTemplate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 16,
  },
  // Floating fun emojis
  floatingEmoji: {
    position: 'absolute',
    zIndex: 1,
    opacity: 0.65,
  },
  floatingEmojiText: {
    fontSize: 22,
  },
  // Premium Month Selector
  monthBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    elevation: 6,
    shadowColor: '#02632D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTouchable: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  monthDateContainerWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  monthDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthDateContainerRTL: {
    flexDirection: 'row-reverse',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  // Premium Employee Card
  employeeCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderRTL: { flexDirection: 'row-reverse' },
  avatarContainer: {
    marginRight: 12,
  },
  avatarContainerRTL: { marginRight: 0, marginLeft: 12 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#02632D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statsRowRTL: { flexDirection: 'row-reverse' },
  daysText: {
    fontSize: 14,
    color: '#666',
  },
  hoursContainer: {
    alignItems: 'flex-end',
  },
  hoursContainerRTL: { alignItems: 'flex-start' },
  hoursLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  hoursValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  textRTL: { textAlign: 'right' },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressContainerRTL: { flexDirection: 'row-reverse' },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarBgRTL: { flexDirection: 'row-reverse' },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressBarFillRTL: { alignSelf: 'flex-end' },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 45,
    textAlign: 'right',
  },
  progressTextRTL: {
    textAlign: 'left',
  },
  // Celebration badge
  celebrateBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 18,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  celebrateEmoji: {
    fontSize: 18,
  },
  chevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
  chevronRTL: { right: undefined, left: 16 },
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    marginTop: 20,
    fontSize: 16,
    color: '#ff6b6b',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyEmoji: {
    fontSize: 64,
  },
  emptyText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  listContent: {
    paddingBottom: 24,
    paddingTop: 8,
  },
  // Premium Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    marginHorizontal: 24,
    marginTop: '20%',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  pickerHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  closeModalBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  yearLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  yearInput: {
    borderWidth: 2,
    borderColor: '#02632D',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 100,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  yearScroll: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  yearItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
  },
  yearItemSelected: {
    backgroundColor: '#02632D',
  },
  yearItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  yearItemTextSelected: {
    color: '#fff',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
  },
  monthItem: {
    width: '31%',
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  monthItemGradient: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: 12,
  },
  monthItemSelected: {
    elevation: 4,
    shadowColor: '#02632D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  monthItemDisabled: {
    opacity: 0.4,
  },
  monthItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  monthItemTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  monthItemTextDisabled: {
    color: '#999',
  },
  pickerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cancelBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  okBtn: {
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#02632D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  okBtnGradient: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
  },
  okBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
