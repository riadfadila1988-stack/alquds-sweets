import api from './api';
import { User } from '@/types/user';

export const login = async (idNumber: string, password: string): Promise<{ token: string; user: User }> => {
    const response = await api.post('/users/login', { idNumber, password });
    return response.data;
};

