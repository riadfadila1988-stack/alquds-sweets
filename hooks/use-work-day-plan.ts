import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWorkDayPlanByDate, createOrUpdateWorkDayPlan, updateUserTask } from '@/services/work-day-plan';

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
    onSuccess: (updatedPlan) => {
      // Directly update the cache with the returned plan to avoid race conditions
      // where a refetch might return stale data if the server is slow to index/update.
      if (updatedPlan) {
        queryClient.setQueryData(['workDayPlan', effectiveDate], updatedPlan);
      }
      // Still invalidate to ensure consistency eventually, but the immediate UI update is handled above
      queryClient.invalidateQueries({ queryKey: ['workDayPlan'] });
      queryClient.invalidateQueries({ queryKey: ['workDayPlans'] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: updateUserTask,
    onSuccess: (updatedPlan) => {
      if (updatedPlan) {
        queryClient.setQueryData(['workDayPlan', effectiveDate], updatedPlan);
      }
      queryClient.invalidateQueries({ queryKey: ['workDayPlan'] });
      queryClient.invalidateQueries({ queryKey: ['workDayPlans'] });
    },
  });

  const updateEmployeeTasksMutation = useMutation({
    mutationFn: async ({ date, userId, tasks }: { date: string, userId: string, tasks: any[] }) => {
      // We import updateEmployeeTasks inside implementation plan but here we need to import it or pass it.
      // Ah, imports are at top. I need to add it to imports first? No, I can just use it if I update imports.
      // But I cannot see imports in this chunk.
      // I'll assume I need to update imports separately or use the existing import if it was *.*
      // The file has: import { getWorkDayPlanByDate, createOrUpdateWorkDayPlan, updateUserTask } from '@/services/work-day-plan';
      // So I need to update imports too.
      // Let's do this sequentially or just use require? No, typescript.
      // I will do multi-replace for this file to handle imports and the mutation.
      return (await import('@/services/work-day-plan')).updateEmployeeTasks({ date, userId, tasks });
    },
    onSuccess: (updatedPlan) => {
      if (updatedPlan) {
        queryClient.setQueryData(['workDayPlan', effectiveDate], updatedPlan);
      }
      queryClient.invalidateQueries({ queryKey: ['workDayPlan'] });
      queryClient.invalidateQueries({ queryKey: ['workDayPlans'] });
    },
  });

  return {
    plan,
    isLoading,
    error: error?.message,
    save: saveMutation.mutateAsync,
    updateTask: updateTaskMutation.mutateAsync,
    updateEmployeeTasks: updateEmployeeTasksMutation.mutateAsync,
    refetch, // expose refetch so callers can trigger a manual refresh (used by work-status interval)
  };
}
