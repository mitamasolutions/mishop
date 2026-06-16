import { Injectable } from '@nestjs/common';
import { normalizeGiftCardCode, type GiftCardProps, type GiftCardRedemptionOutput } from '../domain/gift-card.models';
import type {
  ActiveRedemptionRecord,
  GiftCardCommitOutcome,
  GiftCardCommitRedemptionInput,
  GiftCardReleaseInput,
  GiftCardReleaseOutcome,
  GiftCardRepository,
} from '../domain/gift-card.repository';

interface RedemptionRow {
  id: string;
  storeId: string;
  giftCardId: string;
  orderId: string;
  amount: number;
  idempotencyKey: string;
  result: GiftCardRedemptionOutput;
  reversedAt: Date | null;
}

@Injectable()
export class InMemoryGiftCardRepository implements GiftCardRepository {
  private readonly cardsById = new Map<string, GiftCardProps>();
  private readonly idsByCode = new Map<string, string>();
  private readonly redemptionsByKey = new Map<string, RedemptionRow>();
  private readonly redemptionsById = new Map<string, RedemptionRow>();

  async save(card: GiftCardProps): Promise<void> {
    this.cardsById.set(card.id, { ...card });
    this.idsByCode.set(codeKey(card.storeId, card.code), card.id);
  }

  async findByCode(storeId: string, code: string): Promise<GiftCardProps | null> {
    const id = this.idsByCode.get(codeKey(storeId, normalizeGiftCardCode(code)));
    if (!id) return null;
    return this.findById(storeId, id);
  }

  async findById(storeId: string, id: string): Promise<GiftCardProps | null> {
    const card = this.cardsById.get(id);
    return card?.storeId === storeId ? { ...card } : null;
  }

  async findIdempotency(storeId: string, key: string): Promise<GiftCardRedemptionOutput | null> {
    const row = this.redemptionsByKey.get(idempotencyKey(storeId, key));
    return row ? { ...row.result } : null;
  }

  // Compare-and-set síncrono: no usar `await` entre la lectura de `version`
  // y la mutación; eso es lo que vuelve honesto el test de carrera con
  // `Promise.all` (la operación es atómica respecto al event loop).
  async commitRedemption(input: GiftCardCommitRedemptionInput): Promise<GiftCardCommitOutcome> {
    const idemKey = idempotencyKey(input.storeId, input.idempotencyKey);
    const existing = this.redemptionsByKey.get(idemKey);
    if (existing) return { kind: 'duplicate', result: { ...existing.result } };
    const card = this.cardsById.get(input.giftCardId);
    if (!card || card.storeId !== input.storeId) return { kind: 'conflict' };
    if (card.version !== input.expectedVersion) return { kind: 'conflict' };
    card.balance = input.newBalance;
    card.status = input.newStatus;
    card.version += 1;
    card.updatedAt = new Date();
    const row: RedemptionRow = {
      id: crypto.randomUUID(),
      storeId: input.storeId,
      giftCardId: input.giftCardId,
      orderId: input.orderId,
      amount: input.result.redeemedAmount,
      idempotencyKey: input.idempotencyKey,
      result: { ...input.result },
      reversedAt: null,
    };
    this.redemptionsByKey.set(idemKey, row);
    this.redemptionsById.set(row.id, row);
    return { kind: 'committed' };
  }

  async findActiveRedemptionsByOrder(storeId: string, orderId: string): Promise<ActiveRedemptionRecord[]> {
    const records: ActiveRedemptionRecord[] = [];
    for (const row of this.redemptionsById.values()) {
      if (row.storeId === storeId && row.orderId === orderId && row.reversedAt === null) {
        records.push({ redemptionId: row.id, giftCardId: row.giftCardId, amount: row.amount });
      }
    }
    return records;
  }

  // Compare-and-set síncrono: marca `reversedAt` y restituye saldo en un
  // único paso atómico respecto al event loop. La doble emisión del evento
  // de cancelación/refund se vuelve no-op (already_released).
  async releaseRedemption(input: GiftCardReleaseInput): Promise<GiftCardReleaseOutcome> {
    const row = this.redemptionsById.get(input.redemptionId);
    if (!row || row.storeId !== input.storeId) return { kind: 'already_released' };
    if (row.reversedAt !== null) return { kind: 'already_released' };
    const card = this.cardsById.get(input.giftCardId);
    if (!card || card.storeId !== input.storeId) return { kind: 'conflict' };
    if (card.version !== input.expectedVersion) return { kind: 'conflict' };
    row.reversedAt = new Date();
    card.balance = input.restoredBalance;
    card.status = input.newStatus;
    card.version += 1;
    card.updatedAt = new Date();
    return { kind: 'released' };
  }
}

function codeKey(storeId: string, code: string): string {
  return `${storeId}:${code}`;
}

function idempotencyKey(storeId: string, key: string): string {
  return `${storeId}:${key}`;
}
