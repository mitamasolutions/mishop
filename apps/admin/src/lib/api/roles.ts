import { apiFetch } from '../api-client';
import type { RoleOutput } from './types';

export function listRoles(): Promise<RoleOutput[]> {
  return apiFetch<RoleOutput[]>('/roles');
}

export function getRole(id: string): Promise<RoleOutput> {
  return apiFetch<RoleOutput>(`/roles/${id}`);
}

export function createRole(name: string, permissions: string[]): Promise<{ roleId: string }> {
  return apiFetch<{ roleId: string }>('/roles', { method: 'POST', body: { name, permissions } });
}

export function updateRole(id: string, input: { name?: string; permissions?: string[] }): Promise<void> {
  return apiFetch<void>(`/roles/${id}`, { method: 'PATCH', body: input });
}

export function deleteRole(id: string): Promise<void> {
  return apiFetch<void>(`/roles/${id}`, { method: 'DELETE' });
}
