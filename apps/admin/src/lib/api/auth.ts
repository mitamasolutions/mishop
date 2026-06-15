import { apiFetch } from '../api-client';

/**
 * El refresh token se entrega y mantiene en la cookie HttpOnly `mitama_refresh`
 * (r22 · sprint1_cierre): no aparece en este DTO ni se manipula desde JS.
 */
export interface LoginResult {
  accessToken: string;
  user: { id: string; email: string; name: string; isSuperAdmin: boolean };
}

export function login(email: string, password: string): Promise<LoginResult> {
  return apiFetch<LoginResult>('/auth/login', { method: 'POST', body: { email, password }, skipAuth: true });
}

export function logout(): Promise<void> {
  // El refresh token viaja en cookie; el body queda vacío.
  return apiFetch<void>('/auth/logout', { method: 'POST', body: {} });
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return apiFetch<void>('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } });
}
