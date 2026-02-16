import { Platform } from 'react-native';
import { api, setToken, removeToken } from './client';
import type { AuthResponse } from '../types';

const deviceType = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';

export async function login(loginId: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', {
    login: loginId.trim(),
    password,
    deviceType,
  });
  await setToken(data.token);
  return data;
}

export async function forceLogoutAll(payload: {
  forceLogoutToken?: string;
  login?: string;
  password?: string;
  phone?: string;
  otp?: string;
}): Promise<{ success: boolean; message: string }> {
  const { data } = await api.post<{ success: boolean; message: string }>(
    '/auth/force-logout-all',
    payload,
  );
  return data;
}

export async function getProfile() {
  const { data } = await api.get('/auth/profile');
  return data;
}

export async function logout() {
  await removeToken();
}
