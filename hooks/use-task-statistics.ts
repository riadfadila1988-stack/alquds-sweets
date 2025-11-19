// filepath: c:\Users\user8\Desktop\alquds\alquds-sweets\hooks\use-task-statistics.ts
import { useState, useEffect, useCallback } from 'react';
import { getTaskMonthlyStatistics, TaskStats } from '@/services/task-statistics';

export const useTaskStatistics = (year: number, month: number) => {
  const [statistics, setStatistics] = useState<TaskStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getTaskMonthlyStatistics(year, month);
      setStatistics(data);
    } catch (err: any) {
      console.error('Error fetching task statistics:', err);
      setError(err.message || 'Failed to fetch task statistics');
    } finally {
      setIsLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return {
    statistics,
    isLoading,
    error,
    refetch: fetchStatistics,
  };
};

