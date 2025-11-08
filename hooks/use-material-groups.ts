import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMaterialGroups, createMaterialGroup, updateMaterialGroup, deleteMaterialGroup, getMaterialGroup } from '@/services/material-group';

export function useMaterialGroups() {
  const queryClient = useQueryClient();

  const { data: materialGroups, isLoading, error } = useQuery<any[], Error>({
    queryKey: ['materialGroups'],
    queryFn: getMaterialGroups,
  });

  const createMutation = useMutation({
    mutationFn: createMaterialGroup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materialGroups'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateMaterialGroup(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materialGroups'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMaterialGroup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materialGroups'] }),
  });

  return {
    materialGroups,
    isLoading,
    error: error?.message,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
  };
}

export function useMaterialGroup(id?: string) {
  const { data, isLoading, error } = useQuery<any, Error>({
    queryKey: ['materialGroup', id],
    queryFn: () => (id ? getMaterialGroup(id) : Promise.resolve(null)),
    enabled: !!id,
  });

  return { materialGroup: data, isLoading, error: error?.message };
}

