import { useState, useEffect, useCallback } from 'react';
import { getEmployeesMonthlySummary } from '@/services/employee-attendance';
import { User } from '@/types/user';

export interface EmployeeMonthlySummary {
  employee: User;
  totalHours: number;
  totalMinutes: number;
  totalDays: number;
}

export function useEmployeesHours(year: number, month: number) {
  const [data, setData] = useState<EmployeeMonthlySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getEmployeesMonthlySummary(year, month);
      setData(result.employees);
    } catch (e) {
      setError('Failed to fetch employees hours');
    } finally {
      setIsLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
