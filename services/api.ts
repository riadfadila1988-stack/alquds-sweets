import axios from 'axios';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { emitLogout } from './auth-events';

const api = axios.create({
    baseURL: 'http://192.168.33.19:5000/api/v1',
});

api.interceptors.request.use(async (config) => {
    try {
        const token = await AsyncStorage.getItem('@token');
        if (token) {
            config.headers = config.headers || {};
            (config.headers as any)['Authorization'] = `Bearer ${token}`;
        }
        // Dev logging: show outgoing request and whether token is attached
        try {
          if (typeof __DEV__ !== 'undefined' && __DEV__) {
            console.debug('[API] request', { url: config.url, method: config.method, hasAuth: !!token });
          }
        } catch (e) {}
    } catch {}
    return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If the server responded with 401, clear stored auth and notify listeners
    try {
      const status = error?.response?.status;
      if (status === 401) {
        try {
          await AsyncStorage.removeItem('@token');
          await AsyncStorage.removeItem('@user');
        } catch (e) {}
        emitLogout();
      }
    } catch (e) {}
    return Promise.reject(error);
  }
);

export default api;