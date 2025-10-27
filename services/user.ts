import api from './api';
import { CreateUserRequest, User } from '@/types/user';

// Use CreateUserRequest to represent the data required to create a user
export const addUser = async (userData: CreateUserRequest) => {
    const response = await api.post('/users/add', userData);
    return response.data;
};

export const getUsers = async (): Promise<User[]> => {
    const { data } = await api.get('/users');
    return data;
};
