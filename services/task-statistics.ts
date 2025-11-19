import api from './api';

const BASE_URL = '/task-statistics';

export interface TaskStats {
  _id: string;
  taskName: string;
  timesAssigned: number;
  timesCompleted: number;
  lateTasks: number;
  averageDuration: number;
    description: string;
    duration: number;
}

export const getTaskMonthlyStatistics = async (year: number, month: number): Promise<TaskStats[]> => {
  try {
    console.log('Fetching task statistics for:', year, month);
    const response = await api.get(`${BASE_URL}/monthly?year=${year}&month=${month}`);
    console.log('Task statistics response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching task statistics:', error);
    throw error;
  }
};

