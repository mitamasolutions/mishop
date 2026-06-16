import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/db';
import { recordActivity, type RecordActivityInput } from '../../activity-log';
import { Store } from '../domain/store.entity';
import type { StoreRepository } from '../domain/store.repository';

interface StoreRow {
  id: string;
  name: string;
  code: string;
  url: string | null;
  currencyCode: string;
  regionId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PrismaStoreRepository implements StoreRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Store | null> {
    const row = await this.prisma.store.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByCode(code: string): Promise<Store | null> {
    const row = await this.prisma.store.findUnique({ where: { code } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<Store[]> {
    const rows = await this.prisma.store.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map((row) => this.toDomain(row));
  }

  async create(store: Store, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.store.create({ data: this.toRow(store) });
      await recordActivity(tx, activity);
    });
  }

  async update(store: Store, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.store.update({ where: { id: store.id }, data: this.toRow(store) });
      await recordActivity(tx, activity);
    });
  }

  private toRow(store: Store) {
    return {
      id: store.id,
      name: store.name,
      code: store.code,
      url: store.url,
      currencyCode: store.currencyCode,
      regionId: store.regionId,
      isActive: store.isActive,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
    };
  }

  private toDomain(row: StoreRow): Store {
    return Store.rehydrate(
      {
        name: row.name,
        code: row.code,
        url: row.url,
        currencyCode: row.currencyCode,
        regionId: row.regionId,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      row.id,
    );
  }
}
