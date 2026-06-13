import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/db';
import { Region } from '../domain/region.entity';
import type { RegionRepository } from '../domain/region.repository';

@Injectable()
export class PrismaRegionRepository implements RegionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Region[]> {
    const rows = await this.prisma.region.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) =>
      Region.rehydrate(row.id, {
        name: row.name,
        currencyCode: row.currencyCode,
        automaticTaxes: row.automaticTaxes,
      }),
    );
  }

  async findById(id: string): Promise<Region | null> {
    const row = await this.prisma.region.findFirst({ where: { id, deletedAt: null } });
    if (!row) {
      return null;
    }
    return Region.rehydrate(row.id, {
      name: row.name,
      currencyCode: row.currencyCode,
      automaticTaxes: row.automaticTaxes,
    });
  }
}
