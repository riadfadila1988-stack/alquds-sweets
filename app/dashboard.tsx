import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withRepeat, withSequence, withTiming, interpolate, useDerivedValue } from 'react-native-reanimated';
import ProductsStatisticsScreen from './products-statistics';
import EmployeesStatisticsScreen from './employees-statistics';
import TasksStatisticsScreen from './tasks-statistics';
import { useAuth } from '@/hooks/use-auth';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '@/app/_i18n';
import { ScreenTemplate } from '@/components/ScreenTemplate';

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'products' | 'employees' | 'tasks'>('products');
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

  const { t } = useTranslation();

  const monthNames = [
    t('month_jan'), t('month_feb'), t('month_mar'), t('month_apr'), t('month_may'), t('month_jun'),
    t('month_jul'), t('month_aug'), t('month_sep'), t('month_oct'), t('month_nov'), t('month_dec')
  ];

  const tabScale = useSharedValue(1);
  const monthScale = useSharedValue(1);
  const floatAnim = useSharedValue(0);
  const rotateAnim = useSharedValue(0);

  // Fun floating animation for emojis
  useEffect(() => {
    floatAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      true
    );

    rotateAnim.value = withRepeat(
      withTiming(360, { duration: 10000 }),
      -1,
      false
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // derive a rotation string on the UI thread to avoid touching .value in render
  const rotateDeg = useDerivedValue(() => `${rotateAnim.value}deg`);

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(floatAnim.value, [0, 1], [0, -10]) }
    ]
  }));

  const floatingStyle2 = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(floatAnim.value, [0, 1], [0, 8]) }
    ]
  }));

  const rotatingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: rotateDeg.value }]
  }));

  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
    monthScale.value = withSpring(0.9, {}, () => {
      monthScale.value = withSpring(1);
    });
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
    monthScale.value = withSpring(0.9, {}, () => {
      monthScale.value = withSpring(1);
    });
  };

  const handleTabPress = (tab: 'products' | 'employees' | 'tasks') => {
      setSelectedTab(tab);
    tabScale.value = withSpring(0.95, {}, () => {
      tabScale.value = withSpring(1);
    });
  };

  const animatedTabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tabScale.value }],
  }));

  const animatedMonthStyle = useAnimatedStyle(() => ({
    transform: [{ scale: monthScale.value }],
  }));

  if (isLoading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator size="large" color="#ff7e5f" /></View>;

  if (user?.role !== 'admin') {
    return (
      <ScreenTemplate title={t('dashboard_restricted_title')} subtitle={''} showBackButton={true}>
        <View style={styles.center}>
          <Text style={styles.restrictedTitle}>{t('dashboard_restricted_title')}</Text>
          <Text style={styles.restrictedText}>{t('dashboard_restricted_text')}</Text>
        </View>
      </ScreenTemplate>
    );
  }

  return (
    <ScreenTemplate title={t('dashboard_title')} subtitle={t('dashboard_subtitle')} showBackButton={true} headerGradient={["#ff7e5f","#feb47b","#ff9a9e"] as any}>
      <View style={styles.container}>
        <LinearGradient colors={['#f093fb', '#f5576c', '#4facfe']} style={styles.funBackground}>
          {/* Floating decorative elements */}
          <Animated.View style={[styles.floatingEmoji, styles.emoji1, floatingStyle]}>
            <Text style={styles.emojiText}>📊</Text>
          </Animated.View>
          <Animated.View style={[styles.floatingEmoji, styles.emoji2, floatingStyle2]}>
            <Text style={styles.emojiText}>✨</Text>
          </Animated.View>
          <Animated.View style={[styles.floatingEmoji, styles.emoji3, rotatingStyle]}>
            <Text style={styles.emojiText}>⭐</Text>
          </Animated.View>

          {/* Header Controls */}
          <View style={styles.headerControls}>
            {/* Modern Date Selector */}
            <Animated.View style={[styles.modernDateSelector, animatedMonthStyle]}>
              <LinearGradient
                colors={['#ffffff', '#f8f9fa']}
                style={styles.dateSelectorGradient}
              >
                <TouchableOpacity onPress={goToPreviousMonth} style={styles.modernArrowButton}>
                  <LinearGradient colors={['#ff7e5f', '#feb47b']} style={styles.arrowGradient}>
                    <Ionicons name="chevron-back" size={20} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.dateDisplayModern}>
                  <Text style={styles.dateLabel}>{t('dashboard_date_label')}</Text>
                  <Text style={styles.dateTextModern}>📅 {monthNames[selectedMonth - 1]} {selectedYear}</Text>
                </View>

                <TouchableOpacity onPress={goToNextMonth} style={styles.modernArrowButton}>
                  <LinearGradient colors={['#ff7e5f', '#feb47b']} style={styles.arrowGradient}>
                    <Ionicons name="chevron-forward" size={20} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>

            {/* Modern Tab Bar */}
            <Animated.View style={[styles.modernTabBar, animatedTabStyle]}>
              <TouchableOpacity
                style={[styles.modernTabButton, selectedTab === 'products' && styles.modernTabButtonActive]}
                onPress={() => handleTabPress('products')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={selectedTab === 'products' ? ['#ff7e5f', '#feb47b'] : ['#ffffff', '#f8f9fa']}
                  style={styles.modernTabGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.tabIconContainer}>
                    <Ionicons name="cube" size={28} color={selectedTab === 'products' ? '#fff' : '#ff7e5f'} />
                  </View>
                  <Text style={[styles.modernTabText, selectedTab === 'products' && styles.modernTabTextActive]}>
                    {t('dashboard_tab_products')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modernTabButton, selectedTab === 'employees' && styles.modernTabButtonActive]}
                onPress={() => handleTabPress('employees')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={selectedTab === 'employees' ? ['#4facfe', '#00f2fe'] : ['#ffffff', '#f8f9fa']}
                  style={styles.modernTabGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.tabIconContainer}>
                    <Ionicons name="people" size={28} color={selectedTab === 'employees' ? '#fff' : '#4facfe'} />
                  </View>
                  <Text style={[styles.modernTabText, selectedTab === 'employees' && styles.modernTabTextActive]}>
                    {t('dashboard_tab_employees')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modernTabButton, selectedTab === 'tasks' && styles.modernTabButtonActive]}
                onPress={() => handleTabPress('tasks')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={selectedTab === 'tasks' ? ['#43e97b', '#38f9d7'] : ['#ffffff', '#f8f9fa']}
                  style={styles.modernTabGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.tabIconContainer}>
                    <Ionicons name="checkmark-done" size={28} color={selectedTab === 'tasks' ? '#fff' : '#43e97b'} />
                  </View>
                  <Text style={[styles.modernTabText, selectedTab === 'tasks' && styles.modernTabTextActive]}>
                    {t('dashboard_tab_tasks')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Statistics Content - Direct render without wrapper View */}
          {selectedTab === 'products' && <ProductsStatisticsScreen year={selectedYear} month={selectedMonth} setSelectedTab={setSelectedTab} />}
          {selectedTab === 'employees' && <EmployeesStatisticsScreen year={selectedYear} month={selectedMonth} setSelectedTab={setSelectedTab} />}
          {selectedTab === 'tasks' && <TasksStatisticsScreen year={selectedYear} month={selectedMonth} setSelectedTab={setSelectedTab} />}
        </LinearGradient>
      </View>
    </ScreenTemplate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  funBackground: {
    flex: 1,
    borderRadius: 24,
    margin: 8,
    padding: 8,
    elevation: 12,
    shadowColor: '#ff7e5f',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    position: 'relative',
  },
  headerControls: {
    zIndex: 10,
  },
  // Floating emoji decorations
  floatingEmoji: {
    position: 'absolute',
    zIndex: 1,
  },
  emoji1: {
    top: 20,
    right: 30,
  },
  emoji2: {
    top: 100,
    left: 30,
  },
  emoji3: {
    bottom: 150,
    right: 40,
  },
  emojiText: {
    fontSize: 32,
    opacity: 0.3,
  },
  // Modern Header Card
  modernHeaderCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  headerGradient: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#fff',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.95,
    fontWeight: '600',
  },
  // Modern Date Selector
  modernDateSelector: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  dateSelectorGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  modernArrowButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  arrowGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  dateDisplayModern: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  dateLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  dateTextModern: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
    letterSpacing: 0.5,
  },
  // Modern Tab Bar
  modernTabBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  modernTabButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  modernTabButtonActive: {
    elevation: 8,
    shadowOpacity: 0.3,
  },
  modernTabGradient: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderRadius: 16,
  },
  tabIconContainer: {
    marginBottom: 8,
  },
  modernTabText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  modernTabTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  // Stats Container
  statsContainer: {
    flex: 1,
    minHeight: 300,
  },
  // Legacy styles for restricted access
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  restrictedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  restrictedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
