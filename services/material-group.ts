import api from './api';

const BASE = '/material-groups';

export const getMaterialGroups = async () => {
  const response = await api.get(BASE);
  return response.data;
};

export const getMaterialGroup = async (id: string) => {
  const response = await api.get(`${BASE}/${id}`);
  return response.data;
};

export const createMaterialGroup = async (data: Partial<{ name: string; heName?: string }>) => {
  const response = await api.post(BASE, data);
  return response.data;
};

export const updateMaterialGroup = async (id: string, data: Partial<{ name: string; heName?: string }>) => {
  const response = await api.put(`${BASE}/${id}`, data);
  return response.data;
};

export const deleteMaterialGroup = async (id: string) => {
  const response = await api.delete(`${BASE}/${id}`);
  return response.data;
};
