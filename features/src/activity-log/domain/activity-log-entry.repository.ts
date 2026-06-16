import type { ActivityLogEntry } from './activity-log-entry.entity';

export interface ActivityLogFilter {
  storeId?: string | null;
  userId?: string;
  entityType?: string;
  action?: string;
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
}

export interface ActivityLogPage {
  items: ActivityLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ActivityLogEntryRepository {
  list(filter: ActivityLogFilter): Promise<ActivityLogPage>;
}
