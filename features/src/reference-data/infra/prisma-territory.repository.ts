import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/data';
import { recordActivity, type RecordActivityInput } from '../../activity-log';
import { Territory } from '../domain/territory.entity';
import type { TerritoryRepository } from '../domain/territory.repository';

@Injectable()
export class PrismaTerritoryRepository implements TerritoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Territory | null> {
    const row = await this.prisma.territory.findFirst({ where: { id, deletedAt: null } });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByRegionId(regionId: string): Promise<Territory[]> {
    const rows = await this.prisma.territory.findMany({
      where: { regionId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findByCodeAndRegionId(code: string, regionId: string): Promise<Territory | null> {
    const row = await this.prisma.territory.findFirst({
      where: { code, regionId, deletedAt: null },
    });
    return row ? this.toDomain(row) : null;
  }

  async save(territory: Territory, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.territory.upsert({
        where: { id: territory.id },
        create: this.toRow(territory),
        update: this.toRow(territory),
      });
      await recordActivity(tx, activity);
    });
  }

  async softDelete(id: string, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.territory.update({
        where: { id },
        data: { isActive: false, deletedAt: new Date() },
      });
      await recordActivity(tx, activity);
    });
  }

  async hasActiveZones(id: string): Promise<boolean> {
    const count = await this.prisma.zone.count({ where: { territoryId: id, deletedAt: null, isActive: true } });
    return count > 0;
  }

  private toRow(t: Territory) {
    return {
      id: t.id,
      regionId: t.regionId,
      name: t.name,
      code: t.code,
      isActive: t.isActive,
      automaticFulfillment: t.automaticFulfillment,
      minSubtotal: t.minSubtotal !== null ? t.minSubtotal : null,
      minSubtotalWithTax: t.minSubtotalWithTax,
      freeShippingThreshold: t.freeShippingThreshold !== null ? t.freeShippingThreshold : null,
      freeShippingThresholdWithTax: t.freeShippingThresholdWithTax,
      freeShippingNoDiscount: t.freeShippingNoDiscount,
      shippingCost: t.shippingCost !== null ? t.shippingCost : null,
      description: t.description,
    };
  }

  private toDomain(row: {
    id: string;
    regionId: string;
    name: string;
    code: string;
    isActive: boolean;
    automaticFulfillment: boolean;
    minSubtotal: unknown;
    minSubtotalWithTax: boolean;
    freeShippingThreshold: unknown;
    freeShippingThresholdWithTax: boolean;
    freeShippingNoDiscount: boolean;
    shippingCost: unknown;
    description: string | null;
  }): Territory {
    return Territory.rehydrate(row.id, {
      regionId: row.regionId,
      name: row.name,
      code: row.code,
      isActive: row.isActive,
      automaticFulfillment: row.automaticFulfillment,
      minSubtotal: row.minSubtotal !== null ? Number(row.minSubtotal) : null,
      minSubtotalWithTax: row.minSubtotalWithTax,
      freeShippingThreshold: row.freeShippingThreshold !== null ? Number(row.freeShippingThreshold) : null,
      freeShippingThresholdWithTax: row.freeShippingThresholdWithTax,
      freeShippingNoDiscount: row.freeShippingNoDiscount,
      shippingCost: row.shippingCost !== null ? Number(row.shippingCost) : null,
      description: row.description,
    });
  }
}
