import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTaskGroups, createTaskGroup, updateTaskGroup, deleteTaskGroup } from '@/services/task-group';
import { ITaskGroup } from '@/types/task-group';

export function useTaskGroups() {
  const queryClient = useQueryClient();

  const { data: taskGroups, isLoading, error } = useQuery<ITaskGroup[], Error>({
    queryKey: ['taskGroups'],
    queryFn: getTaskGroups,
  });

  const createMutation = useMutation({
    mutationFn: createTaskGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskGroups'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<ITaskGroup> }) => updateTaskGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskGroups'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTaskGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskGroups'] });
    },
  });

  return {
    taskGroups,
    isLoading,
    error: error?.message,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
  };
}

