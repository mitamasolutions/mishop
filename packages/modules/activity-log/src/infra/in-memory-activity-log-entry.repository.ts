import { ActivityLogEntry } from '../domain/activity-log-entry.entity';
import type { ActivityLogEntryRepository, ActivityLogFilter, ActivityLogPage } from '../domain/activity-log-entry.repository';

/** Adapter in-memory para tests de los casos de uso, sin Prisma. */
export class InMemoryActivityLogEntryRepository implements ActivityLogEntryRepository {
  readonly entries: ActivityLogEntry[] = [];

  async list(filter: ActivityLogFilter): Promise<ActivityLogPage> {
    const filtered = this.entries.filter((entry) => {
      if (filter.storeId !== undefined && entry.storeId !== filter.storeId) return false;
      if (filter.userId !== undefined && entry.userId !== filter.userId) return false;
      if (filter.entityType !== undefined && entry.entityType !== filter.entityType) return false;
      if (filter.action !== undefined && entry.action !== filter.action) return false;
      if (filter.from !== undefined && entry.createdAt < filter.from) return false;
      if (filter.to !== undefined && entry.createdAt > filter.to) return false;
      return true;
    });

    const sorted = [...filtered].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const start = (filter.page - 1) * filter.pageSize;
    const items = sorted.slice(start, start + filter.pageSize);

    return { items, total: filtered.length, page: filter.page, pageSize: filter.pageSize };
  }
}
