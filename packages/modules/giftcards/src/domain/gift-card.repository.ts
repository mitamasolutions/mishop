import type { GiftCardProps, GiftCardRedemptionOutput, GiftCardStatus } from './gift-card.models';

export interface GiftCardCommitRedemptionInput {
  storeId: string;
  giftCardId: string;
  expectedVersion: number;
  newBalance: number;
  newStatus: GiftCardStatus;
  orderId: string;
  idempotencyKey: string;
  result: GiftCardRedemptionOutput;
}

export type GiftCardCommitOutcome =
  | { kind: 'committed' }
  | { kind: 'duplicate'; result: GiftCardRedemptionOutput }
  | { kind: 'conflict' };

export interface ActiveRedemptionRecord {
  redemptionId: string;
  giftCardId: string;
  amount: number;
}

export interface GiftCardReleaseInput {
  storeId: string;
  redemptionId: string;
  giftCardId: string;
  expectedVersion: number;
  restoredBalance: number;
  newStatus: GiftCardStatus;
}

export type GiftCardReleaseOutcome =
  | { kind: 'released' }
  | { kind: 'already_released' }
  | { kind: 'conflict' };

export interface GiftCardRepository {
  save(card: GiftCardProps): Promise<void>;
  findByCode(storeId: string, code: string): Promise<GiftCardProps | null>;
  findById(storeId: string, id: string): Promise<GiftCardProps | null>;
  findIdempotency(storeId: string, key: string): Promise<GiftCardRedemptionOutput | null>;
  commitRedemption(input: GiftCardCommitRedemptionInput): Promise<GiftCardCommitOutcome>;
  /** Redenciones aún no revertidas asociadas a una orden (idempotencia vía `reversedAt`). */
  findActiveRedemptionsByOrder(storeId: string, orderId: string): Promise<ActiveRedemptionRecord[]>;
  /** Marca la redención como `reversed` y restituye saldo con guarda de versión. */
  releaseRedemption(input: GiftCardReleaseInput): Promise<GiftCardReleaseOutcome>;
}
