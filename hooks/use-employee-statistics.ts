import { useState, useEffect, useCallback } from 'react';
import { getEmployeeMonthlyStatistics, EmployeeStats } from '@/services/employee-statistics';

export const useEmployeeStatistics = (year: number, month: number) => {
  const [statistics, setStatistics] = useState<EmployeeStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getEmployeeMonthlyStatistics(year, month);
      setStatistics(data);
    } catch (err: any) {
      console.error('Error fetching employee statistics:', err);
      setError(err.message || 'Failed to fetch employee statistics');
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

