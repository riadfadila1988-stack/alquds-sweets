import api from './api';

export const getWorkDayPlanByDate = async (date: string) => {
  const { data } = await api.get(`/work-day-plans/by-date?date=${encodeURIComponent(date)}`);
  return data;
};

export const getWorkDayPlanByDateForUser = async (date: string, userId: string) => {
  const { data } = await api.get(`/work-day-plans/by-date-for-user?date=${encodeURIComponent(date)}&userId=${encodeURIComponent(userId)}`);
  return data;
};

export const getWorkDayPlans = async () => {
  const { data } = await api.get('/work-day-plans');
  return data;
};

export const createOrUpdateWorkDayPlan = async (payload: { date: string; assignments: any[] }) => {
  const { data } = await api.post('/work-day-plans', payload);
  return data;
};

export const updateUserTask = async (payload: {
  date: string;
  userId: string;
  taskId?: string;
  taskIndex?: number;
  updates: {
    startTime?: Date | string;
    endTime?: Date | string;
    overrunReason?: string;
  };
}) => {
  const { data } = await api.post('/work-day-plans/update-user-task', payload);
  return data;
};

export const deleteWorkDayPlan = async (id: string) => {
  await api.delete(`/work-day-plans/${id}`);
};
