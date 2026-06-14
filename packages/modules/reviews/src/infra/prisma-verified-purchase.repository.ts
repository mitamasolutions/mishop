import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@mitama/db';
import type { VerifiedPurchaseEntry, VerifiedPurchaseRepository } from '../domain/review.repository';

@Injectable()
export class PrismaVerifiedPurchaseRepository implements VerifiedPurchaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async hasVerifiedPurchase(storeId: string, customerId: string, productId: string): Promise<boolean> {
    const row = await this.prisma.verifiedPurchase.findFirst({
      where: { storeId, customerId, productId },
      select: { id: true },
    });
    return row !== null;
  }

  async record(entries: VerifiedPurchaseEntry[]): Promise<void> {
    if (entries.length === 0) return;
    await this.prisma.verifiedPurchase.createMany({
      data: entries.map((entry) => ({ ...entry })),
      skipDuplicates: true,
    } satisfies Prisma.VerifiedPurchaseCreateManyArgs);
  }

  async removeByOrder(storeId: string, orderId: string): Promise<void> {
    await this.prisma.verifiedPurchase.deleteMany({ where: { storeId, orderId } });
  }
}
