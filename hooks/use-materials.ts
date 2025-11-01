import { useState, useEffect, useCallback } from 'react';
import { getMaterials as apiGetMaterials, createMaterial as apiCreateMaterial, updateMaterial as apiUpdateMaterial, updateMaterialQuantity as apiUpdateMaterialQuantity, deleteMaterial as apiDeleteMaterial } from '@/services/material';
import { IMaterial } from '@/types/material';

export function useMaterials() {
  const [materials, setMaterials] = useState<IMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMaterials = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await apiGetMaterials();
      // Expecting the server to return an array
      setMaterials(result || []);
    } catch (e) {
      console.warn('fetchMaterials error', e);
      setError('Failed to load materials');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const create = useCallback(async (data: Partial<IMaterial>) => {
    try {
      setIsLoading(true);
      setError(null);
      await apiCreateMaterial(data);
      await fetchMaterials();
      return true;
    } catch (e) {
      console.warn('createMaterial error', e);
      setError('Failed to create material');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchMaterials]);

  const update = useCallback(async (id: string, data: Partial<IMaterial>) => {
    try {
      setIsLoading(true);
      setError(null);
      await apiUpdateMaterial(id, data);
      await fetchMaterials();
      return true;
    } catch (e) {
      console.warn('updateMaterial error', e);
      setError('Failed to update material');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchMaterials]);

  const updateQuantity = useCallback(async (id: string, data: { quantity?: number }) => {
    try {
      setIsLoading(true);
      setError(null);
      await apiUpdateMaterialQuantity(id, data);
      await fetchMaterials();
      return true;
    } catch (e) {
      console.warn('updateMaterialQuantity error', e);
      setError('Failed to update material');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchMaterials]);

  const remove = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await apiDeleteMaterial(id);
      await fetchMaterials();
      return true;
    } catch (e) {
      console.warn('deleteMaterial error', e);
      setError('Failed to delete material');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchMaterials]);

  return { materials, isLoading, error, refetch: fetchMaterials, create, update, updateQuantity, remove };
}
