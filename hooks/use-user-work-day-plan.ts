import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWorkDayPlanByDateForUser, updateUserTask } from '@/services/work-day-plan';

const formatDateLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export function useUserWorkDayPlan(userId: string | null, date?: string) {
  const queryClient = useQueryClient();

  const effectiveDate = date ?? formatDateLocal(new Date());

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['userWorkDayPlan', effectiveDate, userId],
    queryFn: () => getWorkDayPlanByDateForUser(effectiveDate, userId!),
    enabled: !!effectiveDate && !!userId,
  });

  const updateTaskMutation = useMutation({
    mutationFn: updateUserTask,
    onSuccess: (updatedData) => {
      if (updatedData) {
        // The server now returns only the user's assignment: { date, assignment }
        queryClient.setQueryData(['userWorkDayPlan', effectiveDate, userId], updatedData);
      }
      queryClient.invalidateQueries({ queryKey: ['userWorkDayPlan'] });
      queryClient.invalidateQueries({ queryKey: ['workDayPlan'] });
    },
  });

  return {
    data,
    assignment: data?.assignment || null,
    tasks: data?.assignment?.tasks || [],
    isLoading,
    error: error?.message,
    updateTask: updateTaskMutation.mutateAsync,
    refetch,
  };
}

