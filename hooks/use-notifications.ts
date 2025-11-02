import { useState, useEffect, useCallback } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead, getMyNotifications, markNotificationReadForCurrentUser, markAllNotificationsReadForCurrentUser } from '@/services/notification';
import { useAuth } from './use-auth';

export function useNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

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
    } catch (e) {
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
      await fetch();
      return true;
    } catch {
      return false;
    }
  }, [fetch, user]);

  return { notifications, isLoading, error, refetch: fetch, markRead, markAll };
}
