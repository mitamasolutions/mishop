import { apiFetch } from '../api-client';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string; isSuperAdmin: boolean };
}

export function login(email: string, password: string): Promise<LoginResult> {
  return apiFetch<LoginResult>('/auth/login', { method: 'POST', body: { email, password }, skipAuth: true });
}

export function logout(refreshToken: string): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST', body: { refreshToken } });
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return apiFetch<void>('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } });
}
