import { ok, type Result, type UseCase } from '@mitama/core';
import type { ActivityLogEntryRepository } from '../../domain/activity-log-entry.repository';
import type { ListActivityLogInput, ListActivityLogOutput } from './list-activity-log.dto';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Lista el log de actividad con filtros y paginado. Solo lectura. */
export class ListActivityLogUseCase implements UseCase<ListActivityLogInput, Result<ListActivityLogOutput, never>> {
  constructor(private readonly entries: ActivityLogEntryRepository) {}

  async execute(input: ListActivityLogInput): Promise<Result<ListActivityLogOutput, never>> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const pageSize = input.pageSize && input.pageSize > 0 ? Math.min(input.pageSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;

    const result = await this.entries.list({
      storeId: input.storeId,
      userId: input.userId,
      entityType: input.entityType,
      action: input.action,
      from: input.from,
      to: input.to,
      page,
      pageSize,
    });

    return ok({
      items: result.items.map((entry) => ({
        id: entry.id,
        userId: entry.userId,
        storeId: entry.storeId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        ip: entry.ip,
        diff: entry.diff,
        createdAt: entry.createdAt,
      })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    });
  }
}
