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

// New helper: try multiple endpoints and normalize the logs to a consistent shape
export const getMaterialLogs = async (materialId?: string) => {
    if (materialId) {
    try {
      const data = await getMaterialHistory(materialId);
        return (data || []).map((l: any) => {
            // choose a timestamp candidate from multiple possible fields
            const created = l.createdAt ?? l.date ?? l.timestamp ?? l.time ?? l.dt ?? l._created ?? l.created;

            // format date as: day of month + time (e.g., "18 14:30")
            let dateStr: any = created;
            let time: any = '';
            try {
                const dt = new Date(created);
                if (!isNaN(dt.getTime())) {
                    time = dt.toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'});
                    const day = dt.getDate().toString().padStart(2, '0');
                    const month = (dt.getMonth() + 1).toString().padStart(2, '0');
                    dateStr = `${day}/${month}`;
                }
            } catch {}

            const quantityRaw = l.quantityChange;
            const quantity = Math.abs(quantityRaw);

            const employeeName = l.userId?.name;
            const type = ((quantityRaw < 0) ? 'use' : 'add').toString();

            return {
                date: {day:dateStr, time},
                quantity,
                employeeName,
                type,
                raw: l,
            };
        });
     } catch {
        return [];
     }
   }

  return [];
};
