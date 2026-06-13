import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@mitama/db';
import { ActivityLogEntry } from '../domain/activity-log-entry.entity';
import type { ActivityLogEntryRepository, ActivityLogFilter, ActivityLogPage } from '../domain/activity-log-entry.repository';

interface ActivityLogEntryRow {
  id: string;
  userId: string | null;
  storeId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  ip: string | null;
  diff: Prisma.JsonValue;
  createdAt: Date;
}

/**
 * El log se consulta tanto en alcance global (Super Admin, todas las
 * tiendas) como por tienda activa, según el filtro recibido. Por eso este
 * repo usa el cliente Prisma sin scoping (no `SCOPED_PRISMA`), igual que
 * `PrismaUserStoreRoleRepository` y `PrismaSettingRepository`.
 */
@Injectable()
export class PrismaActivityLogEntryRepository implements ActivityLogEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: ActivityLogFilter): Promise<ActivityLogPage> {
    const where: Prisma.ActivityLogEntryWhereInput = {
      ...(filter.storeId !== undefined ? { storeId: filter.storeId } : {}),
      ...(filter.userId !== undefined ? { userId: filter.userId } : {}),
      ...(filter.entityType !== undefined ? { entityType: filter.entityType } : {}),
      ...(filter.action !== undefined ? { action: filter.action } : {}),
      ...(filter.from || filter.to
        ? { createdAt: { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lte: filter.to } : {}) } }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.activityLogEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.activityLogEntry.count({ where }),
    ]);

    return { items: rows.map((row) => this.toDomain(row)), total, page: filter.page, pageSize: filter.pageSize };
  }

  private toDomain(row: ActivityLogEntryRow): ActivityLogEntry {
    return ActivityLogEntry.rehydrate(
      {
        userId: row.userId,
        storeId: row.storeId,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        ip: row.ip,
        diff: row.diff as Record<string, unknown> | null,
        createdAt: row.createdAt,
      },
      row.id,
    );
  }
}
