import api from './api';
import { IMaterial } from '../types/material';

const BASE = '/materials';

export const getMaterials = async () => {
  const response = await api.get(BASE);
  return response.data;
};

export const createMaterial = async (data: Partial<IMaterial>) => {
  const response = await api.post(BASE, data);
  return response.data;
};

export const updateMaterial = async (id: string, data: Partial<IMaterial>) => {
  const response = await api.put(`${BASE}/${id}`, data);
  return response.data;
};

export const updateMaterialQuantity = async (id: string, data: { quantity?: number }) => {
  const response = await api.patch(`${BASE}/${id}/quantity`, data);
  return response.data;
};

export const deleteMaterial = async (id: string) => {
  const response = await api.delete(`${BASE}/${id}`);
  return response.data;
};
