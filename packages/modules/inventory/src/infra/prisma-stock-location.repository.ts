import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@mitama/db';
import { recordActivity, type RecordActivityInput } from '@mitama/activity-log';
import { StockLocation } from '../domain/stock-location.entity';
import type { StockLocationRepository } from '../domain/stock-location.repository';

interface StockLocationRow {
  id: string;
  name: string;
  isActive: boolean;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PrismaStockLocationRepository implements StockLocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<StockLocation | null> {
    const row = await this.prisma.stockLocation.findFirst({ where: { id, deletedAt: null } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<StockLocation[]> {
    const rows = await this.prisma.stockLocation.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'asc' } });
    return rows.map((row) => this.toDomain(row));
  }

  async create(location: StockLocation, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.stockLocation.create({ data: this.toRow(location) });
      await recordActivity(tx, activity);
    });
  }

  async update(location: StockLocation, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.stockLocation.update({ where: { id: location.id }, data: this.toRow(location) });
      await recordActivity(tx, activity);
    });
  }

  private toRow(location: StockLocation) {
    return {
      id: location.id,
      name: location.name,
      isActive: location.isActive,
      metadata: this.toJson(location.metadata),
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
    };
  }

  private toJson(value: Record<string, unknown> | null): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
  }

  private toDomain(row: StockLocationRow): StockLocation {
    return StockLocation.rehydrate(
      {
        name: row.name,
        isActive: row.isActive,
        metadata: row.metadata as Record<string, unknown> | null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      row.id,
    );
  }
}
