import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWorkDayPlanByDate, createOrUpdateWorkDayPlan } from '@/services/work-day-plan';

const formatDateLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export function useWorkDayPlan(date?: string) {
  const queryClient = useQueryClient();

  const effectiveDate = date ?? formatDateLocal(new Date());

  const { data: plan, isLoading, error, refetch } = useQuery({
    queryKey: ['workDayPlan', effectiveDate],
    queryFn: () => getWorkDayPlanByDate(effectiveDate),
    enabled: !!effectiveDate,
  });

  const saveMutation = useMutation({
    mutationFn: createOrUpdateWorkDayPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workDayPlan'] });
      queryClient.invalidateQueries({ queryKey: ['workDayPlans'] });
    },
  });

  return {
    plan,
    isLoading,
    error: error?.message,
    save: saveMutation.mutateAsync,
    refetch, // expose refetch so callers can trigger a manual refresh (used by work-status interval)
  };
}
