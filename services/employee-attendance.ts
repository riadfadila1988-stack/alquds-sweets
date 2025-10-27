import api from './api';

export const getEmployeesMonthlySummary = async (year: number, month: number) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const response = await api.get('/attendance/admin/summary', {
    params: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
  });
  return response.data;
};

export const getEmployeeMonthlyDetails = async (employeeId: string, year: number, month: number) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const response = await api.get('/attendance/history', {
        params: {
            employeeId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        },
    });
    return response.data;
};

export const clockIn = async (location?: { latitude: number; longitude: number; label?: string }) => {
    const response = await api.post('/attendance/in', { location });
    return response.data;
};

export const clockOut = async (location?: { latitude: number; longitude: number; label?: string }) => {
    const response = await api.post('/attendance/out', { location });
    return response.data;
};

export const getHistory = async () => {
    const response = await api.get('/attendance/history');
    return response.data;
};
