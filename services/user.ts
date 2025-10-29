import api from './api';
import { CreateUserRequest, User, UpdateUserRequest } from '@/types/user';

// Use CreateUserRequest to represent the data required to create a user
export const addUser = async (userData: CreateUserRequest) => {
    const response = await api.post('/users/add', userData);
    return response.data;
};

export const getUsers = async (): Promise<User[]> => {
    const { data } = await api.get('/users');
    return data;
};

// Get a single user by id
export const getUser = async (id: string): Promise<User> => {
    const { data } = await api.get(`/users/${id}`);
    return data;
};

// Update user fields (partial update)
export const updateUser = async (id: string, payload: UpdateUserRequest) => {
    const { data } = await api.put(`/users/${id}`, payload);
    return data;
};
