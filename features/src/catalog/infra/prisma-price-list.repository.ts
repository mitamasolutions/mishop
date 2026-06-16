import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@mitama/db';
import { recordActivity, type RecordActivityInput } from '@mitama/activity-log';
import { PriceList, type PriceListPriceProps, type PriceListStatus, type PriceListType } from '../domain/price-list.entity';
import type { PriceListFilter, PriceListPage, PriceListRepository } from '../domain/price-list.repository';

const PRICE_LIST_INCLUDE = {
  prices: { include: { priceSet: { select: { variantId: true } } } },
} satisfies Prisma.PriceListInclude;

type PriceListRow = Prisma.PriceListGetPayload<{ include: typeof PRICE_LIST_INCLUDE }>;

@Injectable()
export class PrismaPriceListRepository implements PriceListRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PriceList | null> {
    const row = await this.prisma.priceList.findFirst({ where: { id, deletedAt: null }, include: PRICE_LIST_INCLUDE });
    return row ? this.toDomain(row) : null;
  }

  async findAll(filter: PriceListFilter): Promise<PriceListPage> {
    const where: Prisma.PriceListWhereInput = { deletedAt: null };
    if (filter.status) {
      where.status = filter.status as PriceListStatus;
    }

    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;

    const [rows, total] = await Promise.all([
      this.prisma.priceList.findMany({
        where,
        include: PRICE_LIST_INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.priceList.count({ where }),
    ]);

    return { items: rows.map((row) => this.toDomain(row)), total, page, pageSize };
  }

  async findActive(): Promise<PriceList[]> {
    const rows = await this.prisma.priceList.findMany({
      where: { status: 'active', deletedAt: null },
      include: PRICE_LIST_INCLUDE,
    });
    return rows.map((row) => this.toDomain(row));
  }

  async create(priceList: PriceList, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.priceList.create({ data: this.toScalarRow(priceList) });
      await recordActivity(tx, activity);
    });
  }

  async update(priceList: PriceList, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.priceList.update({ where: { id: priceList.id }, data: this.toScalarRow(priceList) });
      await this.syncPrices(tx, priceList);
      await recordActivity(tx, activity);
    });
  }

  async remove(priceList: PriceList, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.priceList.update({ where: { id: priceList.id }, data: { deletedAt: new Date() } });
      await recordActivity(tx, activity);
    });
  }

  private async syncPrices(tx: Prisma.TransactionClient, priceList: PriceList): Promise<void> {
    const existing = await tx.price.findMany({ where: { priceListId: priceList.id } });
    const incomingIds = new Set(priceList.prices.map((price) => price.id));
    const toDelete = existing.filter((price) => !incomingIds.has(price.id));
    if (toDelete.length > 0) {
      await tx.price.deleteMany({ where: { id: { in: toDelete.map((price) => price.id) } } });
    }

    for (const price of priceList.prices) {
      const current = existing.find((row) => row.id === price.id);
      const data = {
        currencyCode: price.currencyCode,
        amount: price.amount,
        minQuantity: price.minQuantity,
        maxQuantity: price.maxQuantity,
      };
      if (current) {
        await tx.price.update({ where: { id: price.id }, data });
      } else {
        const priceSetId = await this.getOrCreatePriceSetId(tx, price.variantId);
        await tx.price.create({ data: { id: price.id, priceSetId, priceListId: priceList.id, ...data } });
      }
    }
  }

  private async getOrCreatePriceSetId(tx: Prisma.TransactionClient, variantId: string): Promise<string> {
    const existing = await tx.priceSet.findUnique({ where: { variantId } });
    if (existing) {
      return existing.id;
    }
    const created = await tx.priceSet.create({ data: { variantId } });
    return created.id;
  }

  private toScalarRow(priceList: PriceList): Prisma.PriceListUncheckedCreateInput {
    return {
      id: priceList.id,
      title: priceList.title,
      description: priceList.description,
      status: priceList.status as PriceListStatus,
      type: priceList.type as PriceListType,
      startsAt: priceList.startsAt,
      endsAt: priceList.endsAt,
    };
  }

  private toDomain(row: PriceListRow): PriceList {
    const prices: PriceListPriceProps[] = row.prices.map((price) => ({
      id: price.id,
      variantId: price.priceSet.variantId,
      currencyCode: price.currencyCode,
      amount: Number(price.amount),
      minQuantity: price.minQuantity,
      maxQuantity: price.maxQuantity,
    }));

    return PriceList.rehydrate(
      {
        title: row.title,
        description: row.description,
        status: row.status as PriceListStatus,
        type: row.type as PriceListType,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        prices,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      row.id,
    );
  }
}
