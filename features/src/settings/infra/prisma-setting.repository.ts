import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@mitama/data';
import { recordActivity, type RecordActivityInput } from '../../activity-log';
import { Setting } from '../domain/setting.entity';
import type { SettingValue } from '../domain/settings-catalog';
import type { SettingRepository } from '../domain/setting.repository';

interface SettingRow {
  id: string;
  key: string;
  storeId: string | null;
  value: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * `Setting` resuelve valores "efectivos" (global `storeId: null` + override
 * de tienda), lo que requiere visibilidad cruzada de scope en una sola
 * consulta. Por eso este repo usa el cliente Prisma sin scoping
 * (no `SCOPED_PRISMA`), igual que `PrismaUserStoreRoleRepository` en
 * `@mitama/auth`.
 *
 * Además, la unicidad de `(key, storeId)` con `storeId: null` no se puede
 * apoyar en el `@@unique` de Postgres (NULL no es igual a NULL), así que
 * para filas globales se usa `findFirst`/`update`/`create` manual en vez de
 * `upsert` con el índice compuesto.
 */
@Injectable()
export class PrismaSettingRepository implements SettingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByKeyAndStore(key: string, storeId: string | null): Promise<Setting | null> {
    const row =
      storeId === null
        ? await this.prisma.setting.findFirst({ where: { key, storeId: null } })
        : await this.prisma.setting.findUnique({ where: { key_storeId: { key, storeId } } });
    return row ? this.toDomain(row) : null;
  }

  async findAllForScope(storeId: string | null): Promise<Setting[]> {
    const rows = await this.prisma.setting.findMany({
      where: storeId === null ? { storeId: null } : { OR: [{ storeId: null }, { storeId }] },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async upsert(setting: Setting, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const value = setting.value as Prisma.InputJsonValue;

      if (setting.storeId === null) {
        const existing = await tx.setting.findFirst({ where: { key: setting.key, storeId: null } });
        if (existing) {
          await tx.setting.update({ where: { id: existing.id }, data: { value, updatedAt: setting.updatedAt } });
        } else {
          await tx.setting.create({
            data: {
              id: setting.id,
              key: setting.key,
              storeId: null,
              value,
              createdAt: setting.createdAt,
              updatedAt: setting.updatedAt,
            },
          });
        }
      } else {
        await tx.setting.upsert({
          where: { key_storeId: { key: setting.key, storeId: setting.storeId } },
          create: {
            id: setting.id,
            key: setting.key,
            storeId: setting.storeId,
            value,
            createdAt: setting.createdAt,
            updatedAt: setting.updatedAt,
          },
          update: { value, updatedAt: setting.updatedAt },
        });
      }

      await recordActivity(tx, activity);
    });
  }

  private toDomain(row: SettingRow): Setting {
    return Setting.rehydrate(
      { key: row.key, storeId: row.storeId, value: row.value as SettingValue, createdAt: row.createdAt, updatedAt: row.updatedAt },
      row.id,
    );
  }
}
