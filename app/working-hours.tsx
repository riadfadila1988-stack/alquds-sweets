import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import * as Location from 'expo-location';
import { useTranslation } from './_i18n';
import { useWorkingHours } from '@/hooks/use-working-hours';
import { useThemeColor } from '@/hooks/use-theme-color';
import Header from './components/header';

export default function WorkingHoursScreen() {
  const { t } = useTranslation();
  const isRTL = true;
  const rtlTextAlign: 'left' | 'right' = 'right';
  const {
    currentSession,
    todaySessions,
    isLoading,
    error,
    clockIn,
    clockOut,
    getTodayTotalHours,
    formatDuration,
  } = useWorkingHours();

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  const handleClockIn = async () => {
    // request device location and pass to API
    let locationPayload: { latitude: number; longitude: number; label?: string } | undefined = undefined;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({});
        locationPayload = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } else {
        Alert.alert(t('locationPermissionDenied') || 'Location permission denied');
      }
    } catch (e) {
      // ignore location errors but alert user
      console.warn('Location error', e);
    }

    const success = await clockIn(locationPayload);
    if (!success) {
      Alert.alert(t('error'), error || t('failedToClockIn'));
    }
  };

  const handleClockOut = async () => {
    Alert.alert(
      t('clockOut'),
      t('confirmClockOut'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('clockOut'),
          onPress: async () => {
            // request location and send with clock out
            let locationPayload: { latitude: number; longitude: number; label?: string } | undefined = undefined;
            try {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status === 'granted') {
                const pos = await Location.getCurrentPositionAsync({});
                locationPayload = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
              } else {
                Alert.alert(t('locationPermissionDenied') || 'Location permission denied');
              }
            } catch (e) {
              console.warn('Location error', e);
            }

            const success = await clockOut(locationPayload);
            if (!success) {
              Alert.alert(t('error'), error || t('failedToClockOut'));
            }
          },
        },
      ]
    );
  };

  const renderCurrentStatus = () => {
    if (isLoading) {
      return (
        <View style={[styles.statusCard, { backgroundColor }]}>
          <Text style={[styles.statusText, { color: textColor, textAlign: rtlTextAlign }]}>
            {t('currentStatus')}: {t('loading')}
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.statusCard, { backgroundColor }]}>
        <Text style={[styles.statusLabel, { color: textColor, textAlign: rtlTextAlign }]}>
          {t('currentStatus')}:
        </Text>
        <Text style={[
          styles.statusValue,
          { color: currentSession ? '#4CAF50' : '#F44336', textAlign: rtlTextAlign }
        ]}>
          {currentSession ? t('clockedIn') : t('clockedOut')}
        </Text>
        {currentSession && (
          <Text style={[styles.clockInTime, { color: textColor, textAlign: rtlTextAlign }]}>
            {t('clockedInAt')} {new Date(currentSession.clockIn).toLocaleTimeString()}
          </Text>
        )}
      </View>
    );
  };

  const renderTodayHours = () => {
    const totalMinutes = getTodayTotalHours();
    const totalHours = formatDuration(totalMinutes);

    return (
      <View style={[styles.hoursCard, { backgroundColor }]}>
        <Text style={[styles.cardTitle, { color: textColor, textAlign: rtlTextAlign }]}>
          {t('workingHoursToday')}
        </Text>
        <Text style={[styles.totalHours, { color: textColor, textAlign: rtlTextAlign }]}>
          {totalHours}
        </Text>
      </View>
    );
  };

  const renderWorkHistory = () => {
    return (
      <View style={[styles.historyCard, { backgroundColor }]}>
        <Text style={[styles.cardTitle, { color: textColor, textAlign: rtlTextAlign }]}>
          {t('workHistory')}
        </Text>
        <ScrollView style={styles.historyList}>
          {todaySessions.length === 0 ? (
            <Text style={[styles.noHistory, { color: textColor, textAlign: rtlTextAlign }]}>
              {t('noWorkHistory')}
            </Text>
          ) : (
            todaySessions.map((session) => (
              <View key={session._id} style={[styles.historyItem, { backgroundColor: '#f5f5f5' }]}>
                <View style={[styles.historyHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.historyDate, { color: textColor, textAlign: rtlTextAlign }]}>
                    {new Date(session.clockIn).toLocaleDateString()}
                  </Text>
                  {session.duration && (
                    <Text style={[styles.historyDuration, { color: '#4CAF50', textAlign: rtlTextAlign }]}>
                      {formatDuration(session.duration)}
                    </Text>
                  )}
                </View>
                <Text style={[styles.historyTime, { color: textColor, textAlign: rtlTextAlign }]}>
                  {t('in')} {new Date(session.clockIn).toLocaleTimeString()}
                </Text>
                {session.clockInLocation ? (
                  <Text style={[styles.historyTime, { color: '#666', textAlign: rtlTextAlign }]}>
                    {t('location') || 'Location'}: {session.clockInLocation.label ? session.clockInLocation.label : `${session.clockInLocation.latitude.toFixed(4)}, ${session.clockInLocation.longitude.toFixed(4)}`}
                  </Text>
                ) : null}

                {session.clockOut ? (
                  <>
                    <Text style={[styles.historyTime, { color: textColor, textAlign: rtlTextAlign }]}>
                      {t('out')} {new Date(session.clockOut).toLocaleTimeString()}
                    </Text>
                    {session.clockOutLocation ? (
                      <Text style={[styles.historyTime, { color: '#666', textAlign: rtlTextAlign }]}>
                        {t('location') || 'Location'}: {session.clockOutLocation.label ? session.clockOutLocation.label : `${session.clockOutLocation.latitude.toFixed(4)}, ${session.clockOutLocation.longitude.toFixed(4)}`}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={[styles.historyTime, { color: '#F44336', textAlign: rtlTextAlign }]}>
                    {t('stillWorking')}
                  </Text>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor }]} contentContainerStyle={{ paddingHorizontal: 0 }}>
      <Header title={t('workingHours') || 'Working hours'} showBack={true} />

      {renderCurrentStatus()}

      <View style={styles.buttonContainer}>
        {!currentSession ? (
          <TouchableOpacity
            style={[styles.clockInButton, { backgroundColor: '#4CAF50' }]}
            onPress={handleClockIn}
          >
            <Text style={styles.buttonText}>{t('clockIn')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.clockOutButton, { backgroundColor: '#F44336' }]}
            onPress={handleClockOut}
          >
            <Text style={styles.buttonText}>{t('clockOut')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {renderTodayHours()}
      {renderWorkHistory()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  statusCard: {
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  clockInTime: {
    fontSize: 14,
    opacity: 0.7,
  },
  buttonContainer: {
    marginBottom: 30,
  },
  clockInButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  clockOutButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  hoursCard: {
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  totalHours: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  historyCard: {
    padding: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  historyList: {
    maxHeight: 200,
  },
  noHistory: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.6,
  },
  historyItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  historyTime: {
    fontSize: 14,
    marginBottom: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyDuration: {
    fontSize: 14,
    fontWeight: '600',
  },
});
