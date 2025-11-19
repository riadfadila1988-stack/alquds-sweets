import { useState, useEffect, useCallback, useRef } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead, getMyNotifications, markNotificationReadForCurrentUser, markAllNotificationsReadForCurrentUser } from '@/services/notification';
import { useAuth } from './use-auth';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { registerPushToken } from '@/services/push-notifications';
import Constants from 'expo-constants';

// NOTE: We intentionally do NOT call Notifications.setNotificationHandler at module load
// because importing 'expo-notifications' triggers automatic push-token registration
// in some environments (Expo Go) which is no longer supported for Android push tokens.

export function useNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  // keep track of which notifications we've already shown as system notifications
  const shownNotifIdsRef = useRef<Set<string>>(new Set());
  const pushTokenRegisteredRef = useRef(false);

  // Register for push notifications and get push token
  const registerForPushNotifications = useCallback(async () => {
    if (pushTokenRegisteredRef.current || !user) return;

    try {
      // If running inside Expo Go (managed client), skip native push registration.
      // Expo removed Android push support from Expo Go (SDK 53+). Use a development build instead.
      if (Constants.appOwnership === 'expo') {
        console.log('Running in Expo Go - skipping native push registration. Use a development build for push notifications.');
        pushTokenRegisteredRef.current = true; // prevent repeated attempts in this session
        return;
      }

      if (Platform.OS === 'web') {
        // Web Push Notifications
        if ('Notification' in window && 'serviceWorker' in navigator) {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            // For web push, you'd need to set up a service worker and VAPID keys
            // This is a placeholder for basic browser notifications
            console.log('Web notifications enabled');
          }
        }
        pushTokenRegisteredRef.current = true;
        return;
      }

      // Native push notifications (iOS/Android)
      if (!Device.isDevice) {
        console.log('Push notifications only work on physical devices');
        return;
      }

      // Lazy-load expo-notifications here to avoid importing it during module init
      const Notifications = (await import('expo-notifications')) as typeof import('expo-notifications');

      // Set the notification handler for foreground notifications
      Notifications.setNotificationHandler(({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      } as any));

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }

      // Get the push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '1f1dbf4f-1625-42cc-b2d6-206dc9a74911',
      });

      const pushToken = tokenData.data;
      console.log('Push token:', pushToken);

      // Register token with your server
      await registerPushToken(pushToken, Platform.OS as 'ios' | 'android');
      pushTokenRegisteredRef.current = true;

      // Set up notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  }, [user]);

  // Request/prepare permissions for push notifications
  useEffect(() => {
    if (user) {
      registerForPushNotifications();
    }
  }, [user, registerForPushNotifications]);

  const fetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      let res;
      if (user && user.role === 'admin') {
        res = await getNotifications();
      } else {
        res = await getMyNotifications();
      }

      setNotifications(res || []);
    } catch {
      setError('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const markRead = useCallback(async (id: string) => {
    try {
      if (user && user.role === 'admin') {
        await markNotificationRead(id);
      } else {
        await markNotificationReadForCurrentUser(id);
      }
      // clear from shown set so it can be shown again in future if unread toggles
      shownNotifIdsRef.current.delete(id);
      await fetch();
      return true;
    } catch {
      return false;
    }
  }, [fetch, user]);

  const markAll = useCallback(async () => {
    try {
      if (user && user.role === 'admin') {
        await markAllNotificationsRead();
      } else {
        await markAllNotificationsReadForCurrentUser();
      }
      // if everything is marked read, clear the shown set to keep memory small
      shownNotifIdsRef.current.clear();
      await fetch();
      return true;
    } catch {
      return false;
    }
  }, [fetch, user]);

  return { notifications, isLoading, error, refetch: fetch, markRead, markAll };
}
