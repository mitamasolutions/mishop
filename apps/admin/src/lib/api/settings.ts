import { apiFetch } from '../api-client';
import type { SettingOutput } from './types';

export function listGlobalSettings(): Promise<SettingOutput[]> {
  return apiFetch<SettingOutput[]>('/settings/global');
}

export function listStoreSettings(): Promise<SettingOutput[]> {
  return apiFetch<SettingOutput[]>('/settings');
}

export function updateGlobalSetting(key: string, value: unknown): Promise<void> {
  return apiFetch<void>(`/settings/global/${key}`, { method: 'PATCH', body: { value } });
}

export function updateStoreSetting(key: string, value: unknown): Promise<void> {
  return apiFetch<void>(`/settings/${key}`, { method: 'PATCH', body: { value } });
}
