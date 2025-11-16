import api from './api';

const BASE_URL = '/material-usage';

export interface MaterialUsageStats {
  _id: string;
  materialName: string;
  totalUsed: number;
  totalAdded: number;
  netChange: number;
  usageCount: number;
  additionCount: number;
}

export const getMonthlyStatistics = async (year: number, month: number): Promise<MaterialUsageStats[]> => {
  try {
    console.log('Fetching statistics for:', year, month);
    const response = await api.get(`${BASE_URL}/statistics/monthly?year=${year}&month=${month}`);
    console.log('Statistics response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching monthly statistics:', error);
    throw error;
  }
};

export const getMaterialHistory = async (
  materialId: string,
  startDate?: Date,
  endDate?: Date,
  limit?: number
) => {
  let url = `${BASE_URL}/material/${materialId}/history?`;
  if (startDate) url += `startDate=${startDate.toISOString()}&`;
  if (endDate) url += `endDate=${endDate.toISOString()}&`;
  if (limit) url += `limit=${limit}`;

  const response = await api.get(url);
  return response.data;
};

export const getAllUsage = async (
  startDate?: Date,
  endDate?: Date,
  limit?: number
) => {
  let url = `${BASE_URL}/all?`;
  if (startDate) url += `startDate=${startDate.toISOString()}&`;
  if (endDate) url += `endDate=${endDate.toISOString()}&`;
  if (limit) url += `limit=${limit}`;

  const response = await api.get(url);
  return response.data;
};

