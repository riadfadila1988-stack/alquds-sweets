import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as apiLogin } from '../services/auth';
import { onLogout } from '../services/auth-events';
import { User } from '@/types/user';

const USER_STORAGE_KEY = '@user';
const TOKEN_STORAGE_KEY = '@token';

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    loadAuthData();

    // subscribe to global logout events (e.g., 401 from API interceptor)
    const unsubscribe = onLogout(() => {
      // call the existing logout implementation
      logout();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadAuthData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const userJson = await AsyncStorage.getItem(USER_STORAGE_KEY);
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      const user = userJson ? JSON.parse(userJson) : null;

      setState({
        user,
        token,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load authentication data',
      }));
    }
  }, []);

  const login = useCallback(async (idNumber: string, password: string) => {
    try {
      const { token, user } = await apiLogin(idNumber, password);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
      setState({
        user,
        token,
        isLoading: false,
        error: null,
      });
      return {status: true, user};
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to login',
      }));
      return {status: false, user: null};
    }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    setState({
      user: null,
      token: null,
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    login,
    logout,
  };
}
