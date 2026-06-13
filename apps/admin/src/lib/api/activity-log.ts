import { apiFetch } from '../api-client';
import type { ActivityLogPage } from './types';

export interface ActivityLogFilters {
  userId?: string;
  entityType?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

function toQuery(filters: ActivityLogFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function listGlobalActivityLog(filters: ActivityLogFilters): Promise<ActivityLogPage> {
  return apiFetch<ActivityLogPage>(`/activity-log/global${toQuery(filters)}`);
}

export function listStoreActivityLog(filters: ActivityLogFilters): Promise<ActivityLogPage> {
  return apiFetch<ActivityLogPage>(`/activity-log${toQuery(filters)}`);
}
