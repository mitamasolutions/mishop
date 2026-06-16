import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/db';
import { recordActivity, type RecordActivityInput } from '../../activity-log';
import { SalesChannel } from '../domain/sales-channel.entity';
import type { SalesChannelRepository } from '../domain/sales-channel.repository';

interface SalesChannelRow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PrismaSalesChannelRepository implements SalesChannelRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<SalesChannel | null> {
    const row = await this.prisma.salesChannel.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<SalesChannel[]> {
    const rows = await this.prisma.salesChannel.findMany({ orderBy: { name: 'asc' } });
    return rows.map((row) => this.toDomain(row));
  }

  async create(channel: SalesChannel, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.salesChannel.create({ data: this.toRow(channel) });
      await recordActivity(tx, activity);
    });
  }

  async update(channel: SalesChannel, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.salesChannel.update({ where: { id: channel.id }, data: this.toRow(channel) });
      await recordActivity(tx, activity);
    });
  }

  private toRow(channel: SalesChannel) {
    return {
      id: channel.id,
      name: channel.name,
      description: channel.description,
      isActive: channel.isActive,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
    };
  }

  private toDomain(row: SalesChannelRow): SalesChannel {
    return SalesChannel.rehydrate(
      {
        name: row.name,
        description: row.description,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      row.id,
    );
  }
}
