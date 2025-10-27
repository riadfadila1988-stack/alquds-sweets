import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWorkDayPlanByDate, createOrUpdateWorkDayPlan } from '@/services/work-day-plan';

export function useWorkDayPlan(date?: string) {
  const queryClient = useQueryClient();

  const { data: plan, isLoading, error } = useQuery({
    queryKey: ['workDayPlan', date],
    queryFn: () => getWorkDayPlanByDate(date || new Date().toISOString()),
    enabled: !!date,
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
  };
}

