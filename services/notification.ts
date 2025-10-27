import api from './api';

const BASE = '/notifications';

export const getNotifications = async () => {
  const response = await api.get(BASE);
  return response.data;
};

export const markNotificationRead = async (id: string) => {
  const response = await api.put(`${BASE}/${id}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await api.put(`${BASE}/mark-all-read`);
  return response.data;
};

// New: create a notification (used when tasks overrun)
export const createNotification = async (message: string, materialId?: string) => {
  const response = await api.post(BASE, { message, materialId });
  return response.data;
};
