import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/data';
import { recordActivity, type RecordActivityInput } from '../../activity-log';
import { Zone } from '../domain/zone.entity';
import type { ZoneRepository } from '../domain/zone.repository';

@Injectable()
export class PrismaZoneRepository implements ZoneRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Zone | null> {
    const row = await this.prisma.zone.findFirst({ where: { id, deletedAt: null } });
    return row ? this.toDomain(row) : null;
  }

  async findByTerritoryId(territoryId: string): Promise<Zone[]> {
    const rows = await this.prisma.zone.findMany({
      where: { territoryId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findByCodeAndTerritoryId(code: string, territoryId: string): Promise<Zone | null> {
    const row = await this.prisma.zone.findFirst({ where: { code, territoryId, deletedAt: null } });
    return row ? this.toDomain(row) : null;
  }

  async save(zone: Zone, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.zone.upsert({
        where: { id: zone.id },
        create: this.toRow(zone),
        update: this.toRow(zone),
      });
      await recordActivity(tx, activity);
    });
  }

  async softDelete(id: string, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.zone.update({
        where: { id },
        data: { isActive: false, deletedAt: new Date() },
      });
      await recordActivity(tx, activity);
    });
  }

  private toRow(z: Zone) {
    return {
      id: z.id,
      territoryId: z.territoryId,
      name: z.name,
      code: z.code,
      isActive: z.isActive,
      description: z.description,
    };
  }

  private toDomain(row: {
    id: string;
    territoryId: string;
    name: string;
    code: string;
    isActive: boolean;
    description: string | null;
  }): Zone {
    return Zone.rehydrate(row.id, {
      territoryId: row.territoryId,
      name: row.name,
      code: row.code,
      isActive: row.isActive,
      description: row.description,
    });
  }
}
