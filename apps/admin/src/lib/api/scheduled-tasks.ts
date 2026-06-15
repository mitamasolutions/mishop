import { apiFetch } from '../api-client';

export interface ScheduledTask {
  id: string;
  name: string;
  type: string;
  seconds: number;
  enabled: boolean;
  stopOnError: boolean;
  lastStartUtc: string | null;
  lastEndUtc: string | null;
  lastSuccessUtc: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export function listScheduledTasks(): Promise<ScheduledTask[]> {
  return apiFetch<ScheduledTask[]>('/scheduled-tasks', { skipStoreScope: true });
}

export function updateScheduledTask(id: string, patch: { seconds?: number; enabled?: boolean; stopOnError?: boolean }): Promise<ScheduledTask> {
  return apiFetch<ScheduledTask>(`/scheduled-tasks/${id}`, { method: 'PATCH', body: patch, skipStoreScope: true });
}

export function runScheduledTaskNow(name: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/scheduled-tasks/${name}/run-now`, { method: 'POST', skipStoreScope: true });
}
