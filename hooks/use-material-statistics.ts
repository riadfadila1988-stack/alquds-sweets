import { useState, useEffect, useCallback } from 'react';
import { getMonthlyStatistics, MaterialUsageStats } from '@/services/material-usage';

export const useMaterialStatistics = (year: number, month: number) => {
  const [statistics, setStatistics] = useState<MaterialUsageStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getMonthlyStatistics(year, month);
      setStatistics(data);
    } catch (err: any) {
      console.error('Error fetching material statistics:', err);
      setError(err.message || 'Failed to fetch statistics');
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

