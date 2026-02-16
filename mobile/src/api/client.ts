import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// اتصال به بکند اصلی پروداکشن (قابل تغییر از app.json -> extra.apiUrl)
const API_URL =
  (typeof Constants !== 'undefined' && Constants.expoConfig?.extra && (Constants.expoConfig.extra as { apiUrl?: string }).apiUrl) ||
  'https://api.manehaghighi.com/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

const TOKEN_KEY = '@manehaghighi_token';

api.interceptors.request.use(async (config) => {
  const publicPaths = ['/auth/login', '/auth/register', '/auth/send-otp', '/auth/verify-otp'];
  const isPublic = publicPaths.some((p) => config.url?.includes(p));
  if (!isPublic) {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      AsyncStorage.removeItem(TOKEN_KEY);
    }
    return Promise.reject(err);
  }
);

export async function setToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function removeToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}
