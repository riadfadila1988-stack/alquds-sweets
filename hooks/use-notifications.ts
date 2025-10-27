import { useState, useEffect, useCallback } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/services/notification';

export function useNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getNotifications();
      setNotifications(res || []);
    } catch (e) {
      setError('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const markRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id);
      await fetch();
      return true;
    } catch {
      return false;
    }
  }, [fetch]);

  const markAll = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      await fetch();
      return true;
    } catch {
      return false;
    }
  }, [fetch]);

  return { notifications, isLoading, error, refetch: fetch, markRead, markAll };
}

