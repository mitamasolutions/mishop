import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/db';
import { PaymentProvider } from '../domain/payment-provider.entity';
import type { PaymentProviderRepository } from '../domain/payment-provider.repository';

@Injectable()
export class PrismaPaymentProviderRepository implements PaymentProviderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<PaymentProvider[]> {
    const rows = await this.prisma.paymentProvider.findMany({ orderBy: { name: 'asc' } });
    return rows.map((row) => PaymentProvider.rehydrate(row.id, { code: row.code, name: row.name }));
  }

  async findById(id: string): Promise<PaymentProvider | null> {
    const row = await this.prisma.paymentProvider.findUnique({ where: { id } });
    if (!row) return null;
    return PaymentProvider.rehydrate(row.id, { code: row.code, name: row.name });
  }

  async findByIds(ids: string[]): Promise<PaymentProvider[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.paymentProvider.findMany({ where: { id: { in: ids } } });
    return rows.map((row) => PaymentProvider.rehydrate(row.id, { code: row.code, name: row.name }));
  }
}
