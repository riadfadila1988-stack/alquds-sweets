import api from './api';

export const getWorkDayPlanByDate = async (date: string) => {
  const { data } = await api.get(`/work-day-plans/by-date?date=${encodeURIComponent(date)}`);
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

export const deleteWorkDayPlan = async (id: string) => {
  await api.delete(`/work-day-plans/${id}`);
};
