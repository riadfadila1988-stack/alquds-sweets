import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMaterials as apiGetMaterials, createMaterial as apiCreateMaterial, updateMaterial as apiUpdateMaterial, updateMaterialQuantity as apiUpdateMaterialQuantity, deleteMaterial as apiDeleteMaterial } from '@/services/material';
import { IMaterial } from '@/types/material';

export function useMaterials() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<IMaterial[], Error>({
    queryKey: ['materials'],
    queryFn: apiGetMaterials,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: apiCreateMaterial,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materials'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<IMaterial> }) => apiUpdateMaterial(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materials'] }),
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { quantity?: number } }) => apiUpdateMaterialQuantity(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materials'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: apiDeleteMaterial,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materials'] }),
  });

  const create = useCallback(async (payload: Partial<IMaterial>) => {
    try {
      await createMutation.mutateAsync(payload);
      return true;
    } catch {
      return false;
    }
  }, [createMutation]);

  const update = useCallback(async (id: string, payload: Partial<IMaterial>) => {
    try {
      await updateMutation.mutateAsync({ id, data: payload });
      return true;
    } catch {
      return false;
    }
  }, [updateMutation]);

  const updateQuantity = useCallback(async (id: string, payload: { quantity?: number }) => {
    try {
      await updateQuantityMutation.mutateAsync({ id, data: payload });
      return true;
    } catch {
      return false;
    }
  }, [updateQuantityMutation]);

  const remove = useCallback(async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  }, [deleteMutation]);

  return {
    materials: data || [],
    isLoading,
    error: error?.message ?? null,
    refetch,
    create,
    update,
    updateQuantity,
    remove,
  };
}
