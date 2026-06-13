import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@mitama/db';
import { recordActivity, type RecordActivityInput } from '@mitama/activity-log';
import { InventoryItem, type InventoryLevelProps } from '../domain/inventory-item.entity';
import type {
  InventoryItemFilter,
  InventoryItemPage,
  InventoryItemRepository,
} from '../domain/inventory-item.repository';

const INVENTORY_ITEM_INCLUDE = {
  levels: true,
  variantLinks: { select: { variantId: true, requiredQuantity: true } },
} satisfies Prisma.InventoryItemInclude;

interface InventoryItemRow {
  id: string;
  sku: string | null;
  title: string | null;
  requiresShipping: boolean;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  levels: {
    id: string;
    locationId: string;
    stockedQuantity: Prisma.Decimal;
    reservedQuantity: Prisma.Decimal;
    incomingQuantity: Prisma.Decimal;
  }[];
  variantLinks: { variantId: string; requiredQuantity: number }[];
}

@Injectable()
export class PrismaInventoryItemRepository implements InventoryItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<InventoryItem | null> {
    const row = await this.prisma.inventoryItem.findFirst({
      where: { id, deletedAt: null },
      include: INVENTORY_ITEM_INCLUDE,
    });
    return row ? this.toDomain(row) : null;
  }

  async findByVariantId(variantId: string): Promise<InventoryItem | null> {
    const link = await this.prisma.productVariantInventoryItem.findUnique({
      where: { variantId },
      include: { inventoryItem: { include: { levels: true } } },
    });
    if (!link || link.inventoryItem.deletedAt) {
      return null;
    }
    return this.toDomain({
      ...link.inventoryItem,
      variantLinks: [{ variantId: link.variantId, requiredQuantity: link.requiredQuantity }],
    });
  }

  async findBySku(sku: string): Promise<InventoryItem | null> {
    const row = await this.prisma.inventoryItem.findFirst({
      where: { sku, deletedAt: null },
      include: INVENTORY_ITEM_INCLUDE,
    });
    return row ? this.toDomain(row) : null;
  }

  async findAll(filter: InventoryItemFilter): Promise<InventoryItemPage> {
    const where: Prisma.InventoryItemWhereInput = { deletedAt: null };

    if (filter.search) {
      where.OR = [
        { sku: { contains: filter.search, mode: 'insensitive' } },
        { title: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;

    const [rows, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        include: INVENTORY_ITEM_INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    return { items: rows.map((row) => this.toDomain(row)), total, page, pageSize };
  }

  async create(item: InventoryItem, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.inventoryItem.create({ data: this.toScalarRow(item) });

      if (item.variantId) {
        await tx.productVariantInventoryItem.create({
          data: { variantId: item.variantId, inventoryItemId: item.id, requiredQuantity: item.requiredQuantity },
        });
      }

      if (item.levels.length > 0) {
        await tx.inventoryLevel.createMany({ data: item.levels.map((level) => this.levelToRow(item.id, level)) });
      }

      await recordActivity(tx, activity);
    });
  }

  async update(item: InventoryItem, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({ where: { id: item.id }, data: this.toScalarRow(item) });
      await this.syncLevels(tx, item);
      await recordActivity(tx, activity);
    });
  }

  async remove(item: InventoryItem, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({ where: { id: item.id }, data: { deletedAt: new Date() } });
      await recordActivity(tx, activity);
    });
  }

  private async syncLevels(tx: Prisma.TransactionClient, item: InventoryItem): Promise<void> {
    const existing = await tx.inventoryLevel.findMany({ where: { inventoryItemId: item.id }, select: { id: true } });
    const incomingIds = new Set(item.levels.map((level) => level.id));

    const toDelete = existing.filter((level) => !incomingIds.has(level.id));
    if (toDelete.length > 0) {
      await tx.inventoryLevel.deleteMany({ where: { id: { in: toDelete.map((level) => level.id) } } });
    }

    for (const level of item.levels) {
      const exists = existing.some((row) => row.id === level.id);
      if (exists) {
        await tx.inventoryLevel.update({ where: { id: level.id }, data: this.levelToData(level) });
      } else {
        await tx.inventoryLevel.create({ data: this.levelToRow(item.id, level) });
      }
    }
  }

  private levelToData(level: InventoryLevelProps) {
    return {
      locationId: level.locationId,
      stockedQuantity: level.stockedQuantity,
      reservedQuantity: level.reservedQuantity,
      incomingQuantity: level.incomingQuantity,
    };
  }

  private levelToRow(inventoryItemId: string, level: InventoryLevelProps) {
    return { id: level.id, inventoryItemId, ...this.levelToData(level) };
  }

  private toScalarRow(item: InventoryItem) {
    return {
      id: item.id,
      sku: item.sku,
      title: item.title,
      requiresShipping: item.requiresShipping,
      metadata: this.toJson(item.metadata),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private toJson(value: Record<string, unknown> | null): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
  }

  private toDomain(row: InventoryItemRow): InventoryItem {
    const variantLink = row.variantLinks[0] ?? null;

    const levels: InventoryLevelProps[] = row.levels.map((level) => ({
      id: level.id,
      locationId: level.locationId,
      stockedQuantity: Number(level.stockedQuantity),
      reservedQuantity: Number(level.reservedQuantity),
      incomingQuantity: Number(level.incomingQuantity),
    }));

    return InventoryItem.rehydrate(
      {
        sku: row.sku,
        title: row.title,
        requiresShipping: row.requiresShipping,
        variantId: variantLink?.variantId ?? null,
        requiredQuantity: variantLink?.requiredQuantity ?? 1,
        metadata: row.metadata as Record<string, unknown> | null,
        levels,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      row.id,
    );
  }
}
