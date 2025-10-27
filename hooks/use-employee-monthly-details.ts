import { useState, useEffect, useCallback } from 'react';
import { getEmployeeMonthlyDetails } from '@/services/employee-attendance';
import { WorkSession } from './use-working-hours';

export function useEmployeeMonthlyDetails(employeeId: string, year: number, month: number) {
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!employeeId) {
      // No employee id yet (router params may not be ready). Ensure we are not stuck in loading state
      setSessions([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const result = await getEmployeeMonthlyDetails(employeeId, year, month);
      setSessions(result.records || []);
    } catch {
      setError('Failed to fetch employee monthly details');
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { sessions, isLoading, error, refetch: fetchData };
}
