import api from './api';
import { ITaskGroup } from '@/types/task-group';

export const getTaskGroups = async (): Promise<ITaskGroup[]> => {
  const { data } = await api.get('/task-groups');
  return data;
};

export const getTaskGroupById = async (id: string): Promise<ITaskGroup> => {
  const { data } = await api.get(`/task-groups/${id}`);
  return data;
};

export const createTaskGroup = async (taskGroup: Partial<ITaskGroup>): Promise<ITaskGroup> => {
  const { data } = await api.post('/task-groups', taskGroup);
  return data;
};

export const updateTaskGroup = async (id: string, taskGroup: Partial<ITaskGroup>): Promise<ITaskGroup> => {
  const { data } = await api.put(`/task-groups/${id}`, taskGroup);
  return data;
};

export const deleteTaskGroup = async (id: string): Promise<void> => {
  await api.delete(`/task-groups/${id}`);
};

