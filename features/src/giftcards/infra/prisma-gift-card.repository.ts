import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@mitama/db';
import { normalizeGiftCardCode, type GiftCardProps, type GiftCardRedemptionOutput, type GiftCardStatus } from '../domain/gift-card.models';
import type {
  ActiveRedemptionRecord,
  GiftCardCommitOutcome,
  GiftCardCommitRedemptionInput,
  GiftCardReleaseInput,
  GiftCardReleaseOutcome,
  GiftCardRepository,
} from '../domain/gift-card.repository';

@Injectable()
export class PrismaGiftCardRepository implements GiftCardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(card: GiftCardProps): Promise<void> {
    await this.prisma.giftCard.upsert({
      where: { id: card.id },
      create: toRow(card),
      update: toRow(card),
    });
  }

  async findByCode(storeId: string, code: string): Promise<GiftCardProps | null> {
    const row = await this.prisma.giftCard.findUnique({ where: { storeId_code: { storeId, code: normalizeGiftCardCode(code) } } });
    return row ? toDomain(row) : null;
  }

  async findById(storeId: string, id: string): Promise<GiftCardProps | null> {
    const row = await this.prisma.giftCard.findFirst({ where: { id, storeId } });
    return row ? toDomain(row) : null;
  }

  async findIdempotency(storeId: string, key: string): Promise<GiftCardRedemptionOutput | null> {
    const row = await this.prisma.giftCardRedemption.findUnique({ where: { storeId_idempotencyKey: { storeId, idempotencyKey: key } } });
    if (!row) return null;
    return row.result as unknown as GiftCardRedemptionOutput;
  }

  async commitRedemption(input: GiftCardCommitRedemptionInput): Promise<GiftCardCommitOutcome> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        try {
          await tx.giftCardRedemption.create({
            data: {
              storeId: input.storeId,
              giftCardId: input.giftCardId,
              orderId: input.orderId,
              amount: input.result.redeemedAmount,
              idempotencyKey: input.idempotencyKey,
              result: input.result as unknown as Prisma.InputJsonValue,
            },
          });
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            const existing = await tx.giftCardRedemption.findUnique({ where: { storeId_idempotencyKey: { storeId: input.storeId, idempotencyKey: input.idempotencyKey } } });
            return { kind: 'duplicate', result: (existing?.result ?? input.result) as unknown as GiftCardRedemptionOutput };
          }
          throw error;
        }
        const updated = await tx.giftCard.updateMany({
          where: { id: input.giftCardId, storeId: input.storeId, version: input.expectedVersion },
          data: { balance: input.newBalance, status: input.newStatus, version: { increment: 1 }, updatedAt: new Date() },
        });
        if (updated.count !== 1) throw new GiftCardVersionConflictError();
        return { kind: 'committed' };
      });
    } catch (error) {
      if (error instanceof GiftCardVersionConflictError) return { kind: 'conflict' };
      throw error;
    }
  }

  async findActiveRedemptionsByOrder(storeId: string, orderId: string): Promise<ActiveRedemptionRecord[]> {
    const rows = await this.prisma.giftCardRedemption.findMany({
      where: { storeId, orderId, reversedAt: null },
      select: { id: true, giftCardId: true, amount: true },
    });
    return rows.map((row) => ({ redemptionId: row.id, giftCardId: row.giftCardId, amount: Number(row.amount) }));
  }

  async releaseRedemption(input: GiftCardReleaseInput): Promise<GiftCardReleaseOutcome> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Guarda de idempotencia: el primer evento marca `reversedAt`; el
        // siguiente encuentra count=0 y se sale como already_released.
        const reversed = await tx.giftCardRedemption.updateMany({
          where: { id: input.redemptionId, storeId: input.storeId, reversedAt: null },
          data: { reversedAt: new Date() },
        });
        if (reversed.count !== 1) return { kind: 'already_released' };
        const updated = await tx.giftCard.updateMany({
          where: { id: input.giftCardId, storeId: input.storeId, version: input.expectedVersion },
          data: { balance: input.restoredBalance, status: input.newStatus, version: { increment: 1 }, updatedAt: new Date() },
        });
        if (updated.count !== 1) throw new GiftCardVersionConflictError();
        return { kind: 'released' };
      });
    } catch (error) {
      if (error instanceof GiftCardVersionConflictError) return { kind: 'conflict' };
      throw error;
    }
  }
}

class GiftCardVersionConflictError extends Error {
  constructor() {
    super('gift card version conflict');
  }
}

function toRow(card: GiftCardProps) {
  return {
    id: card.id,
    storeId: card.storeId,
    code: card.code,
    initialBalance: card.initialBalance,
    balance: card.balance,
    currencyCode: card.currencyCode,
    status: card.status,
    expiresAt: card.expiresAt,
    issuedToCustomerId: card.issuedToCustomerId,
    version: card.version,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  };
}

function toDomain(row: { id: string; storeId: string; code: string; initialBalance: unknown; balance: unknown; currencyCode: string; status: string; expiresAt: Date | null; issuedToCustomerId: string | null; version: number; createdAt: Date; updatedAt: Date }): GiftCardProps {
  return { ...row, initialBalance: Number(row.initialBalance), balance: Number(row.balance), status: row.status as GiftCardStatus };
}
