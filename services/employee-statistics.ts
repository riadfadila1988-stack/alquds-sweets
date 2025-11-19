import api from './api';
const BASE_URL = '/employees';
export interface EmployeeStats {
  _id: string;
  employeeName: string;
  totalHours: number;
  tasksCompleted: number;
  netPerformance: number; // rating or score
  activityCount: number;
}
export const getEmployeeMonthlyStatistics = async (year: number, month: number): Promise<EmployeeStats[]> => {
  try {
    const response = await api.get(`${BASE_URL}/statistics/monthly?year=${year}&month=${month}`);
    return response.data;
  } catch (error) {
    console.warn('Employee statistics endpoint not available or failed, returning empty array', error);
    // Fallback: return empty array to avoid crashing the UI
    return [];
  }
};
