import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@mitama/db';
import type { ShippingMethod, ShippingRateStrategy } from '../domain/shipping-method.entity';
import type { ShippingMethodRepository } from '../domain/shipping-method.repository';

const METHOD_INCLUDE = { zones: true } satisfies Prisma.StoreShippingMethodInclude;
type MethodRow = Prisma.StoreShippingMethodGetPayload<{ include: typeof METHOD_INCLUDE }>;

@Injectable()
export class PrismaShippingMethodRepository implements ShippingMethodRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findEnabledByStore(storeId: string): Promise<ShippingMethod[]> {
    const rows = await this.prisma.storeShippingMethod.findMany({ where: { storeId, enabled: true }, include: METHOD_INCLUDE, orderBy: { name: 'asc' } });
    return rows.map(toDomain);
  }

  async save(method: ShippingMethod): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.storeShippingMethod.upsert({ where: { id: method.id }, create: toRow(method), update: toRow(method) });
      await tx.storeShippingMethodZone.deleteMany({ where: { methodId: method.id } });
      if (method.zoneIds.length > 0) await tx.storeShippingMethodZone.createMany({ data: method.zoneIds.map((zoneId) => ({ methodId: method.id, zoneId })) });
    });
  }
}

function toDomain(row: MethodRow): ShippingMethod {
  return {
    id: row.id,
    storeId: row.storeId,
    providerCode: row.providerCode,
    name: row.name,
    enabled: row.enabled,
    zoneIds: row.zones.map((zone) => zone.zoneId),
    strategy: row.strategy as ShippingRateStrategy,
    baseAmount: Number(row.baseAmount),
    perKgAmount: Number(row.perKgAmount),
    freeOverAmount: row.freeOverAmount === null ? null : Number(row.freeOverAmount),
  };
}

function toRow(method: ShippingMethod): Prisma.StoreShippingMethodUncheckedCreateInput {
  return { id: method.id, storeId: method.storeId, providerCode: method.providerCode, name: method.name, enabled: method.enabled, strategy: method.strategy, baseAmount: method.baseAmount, perKgAmount: method.perKgAmount, freeOverAmount: method.freeOverAmount };
}
