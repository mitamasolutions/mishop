import { apiFetch } from '../api-client';
import type { UserOutput, UserStatus } from './types';

export function listUsers(): Promise<UserOutput[]> {
  return apiFetch<UserOutput[]>('/users');
}

export function getUser(id: string): Promise<UserOutput> {
  return apiFetch<UserOutput>(`/users/${id}`);
}

export interface InviteUserInput {
  email: string;
  name: string;
  roleId: string;
  storeId?: string;
}

export interface InviteUserResult {
  userId: string;
  invitationToken: string;
}

export function inviteUser(input: InviteUserInput): Promise<InviteUserResult> {
  return apiFetch<InviteUserResult>('/users/invite', { method: 'POST', body: input });
}

export function setUserStatus(id: string, status: UserStatus): Promise<void> {
  return apiFetch<void>(`/users/${id}/status`, { method: 'PATCH', body: { status } });
}

export interface AssignUserStoreRoleInput {
  userId: string;
  roleId: string;
  storeId?: string;
}

export function assignUserStoreRole(input: AssignUserStoreRoleInput): Promise<{ assignmentId: string }> {
  return apiFetch<{ assignmentId: string }>('/users/store-roles', { method: 'POST', body: input });
}

export function removeUserStoreRole(assignmentId: string): Promise<void> {
  return apiFetch<void>(`/users/store-roles/${assignmentId}`, { method: 'DELETE' });
}
