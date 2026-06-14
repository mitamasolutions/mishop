import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/db';
import type { StorePaymentMethod, StorePaymentMethodRepository } from '../domain/store-payment-method.repository';

@Injectable()
export class PrismaStorePaymentMethodRepository implements StorePaymentMethodRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findEnabled(storeId: string): Promise<StorePaymentMethod[]> {
    const rows = await this.prisma.storePaymentMethod.findMany({ where: { storeId, enabled: true }, orderBy: { displayName: 'asc' } });
    return rows.map(toDomain);
  }

  async findEnabledByProvider(storeId: string, providerCode: string): Promise<StorePaymentMethod | null> {
    const row = await this.prisma.storePaymentMethod.findUnique({ where: { storeId_providerCode: { storeId, providerCode } } });
    return row?.enabled ? toDomain(row) : null;
  }

  async save(method: StorePaymentMethod): Promise<void> {
    await this.prisma.storePaymentMethod.upsert({
      where: { storeId_providerCode: { storeId: method.storeId, providerCode: method.providerCode } },
      create: method,
      update: method,
    });
  }
}

function toDomain(row: { id: string; storeId: string; providerCode: string; displayName: string; enabled: boolean; encryptedCredentials: string | null; webhookSecret: string | null; captureMode: string }): StorePaymentMethod {
  return { ...row, captureMode: row.captureMode === 'manual' ? 'manual' : 'automatic' };
}
