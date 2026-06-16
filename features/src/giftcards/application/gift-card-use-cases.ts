import { buildIdempotencyKey, err, ok, roundMoney, type Result, type UseCase } from '@mitama/core';
import { GiftCardCurrencyMismatchError, GiftCardNotFoundError, GiftCardNotRedeemableError, GiftCardValidationError } from '../domain/errors';
import { normalizeGiftCardCode, type GiftCardProps, type GiftCardRedemptionOutput, type GiftCardStatus } from '../domain/gift-card.models';
import type { GiftCardRepository } from '../domain/gift-card.repository';
import { toGiftCardOutput, type GiftCardOutput } from './gift-card.dto';

const MAX_REDEEM_RETRIES = 3;
const MAX_RELEASE_RETRIES = 3;

export interface IssueGiftCardInput {
  storeId: string;
  code?: string | null;
  initialBalance: number;
  currencyCode: string;
  expiresAt?: Date | null;
  issuedToCustomerId?: string | null;
}

export class IssueGiftCardUseCase implements UseCase<IssueGiftCardInput, Result<GiftCardOutput, GiftCardValidationError>> {
  constructor(private readonly cards: GiftCardRepository) {}

  async execute(input: IssueGiftCardInput): Promise<Result<GiftCardOutput, GiftCardValidationError>> {
    if (input.initialBalance <= 0) return err(new GiftCardValidationError('El saldo inicial debe ser mayor a cero'));
    const now = new Date();
    const card: GiftCardProps = {
      id: crypto.randomUUID(),
      storeId: input.storeId,
      code: normalizeGiftCardCode(input.code ?? crypto.randomUUID().slice(0, 12)),
      initialBalance: roundMoney(input.initialBalance),
      balance: roundMoney(input.initialBalance),
      currencyCode: input.currencyCode.toUpperCase(),
      status: 'active',
      expiresAt: input.expiresAt ?? null,
      issuedToCustomerId: input.issuedToCustomerId ?? null,
      version: 0,
      createdAt: now,
      updatedAt: now,
    };
    await this.cards.save(card);
    return ok(toGiftCardOutput(card));
  }
}

export class RedeemGiftCardUseCase implements UseCase<{ storeId: string; code: string; orderId: string; orderTotal: number; currencyCode: string; idempotencyKey: string }, Result<GiftCardRedemptionOutput, GiftCardNotFoundError | GiftCardNotRedeemableError | GiftCardCurrencyMismatchError | GiftCardValidationError>> {
  constructor(private readonly cards: GiftCardRepository) {}

  async execute(input: { storeId: string; code: string; orderId: string; orderTotal: number; currencyCode: string; idempotencyKey: string }): Promise<Result<GiftCardRedemptionOutput, GiftCardNotFoundError | GiftCardNotRedeemableError | GiftCardCurrencyMismatchError | GiftCardValidationError>> {
    if (input.orderTotal <= 0) return err(new GiftCardValidationError('El total de la orden debe ser mayor a cero'));
    const key = buildIdempotencyKey('giftcard-redeem', input.idempotencyKey);
    const replay = await this.cards.findIdempotency(input.storeId, key);
    if (replay) return ok(replay);
    const normalizedCode = normalizeGiftCardCode(input.code);
    const expectedCurrency = input.currencyCode.toUpperCase();
    for (let attempt = 0; attempt < MAX_REDEEM_RETRIES; attempt += 1) {
      const card = await this.cards.findByCode(input.storeId, normalizedCode);
      if (!card) return err(new GiftCardNotFoundError());
      const notRedeemable = await this.markExpiredIfNeeded(card);
      if (notRedeemable) return err(notRedeemable);
      if (card.currencyCode !== expectedCurrency) return err(new GiftCardCurrencyMismatchError());
      const redeemedAmount = roundMoney(Math.min(card.balance, input.orderTotal));
      const newBalance = roundMoney(card.balance - redeemedAmount);
      const newStatus: GiftCardStatus = newBalance <= 0 ? 'depleted' : 'active';
      const result: GiftCardRedemptionOutput = { giftCardId: card.id, redeemedAmount, remainingBalance: newBalance, status: newStatus };
      const outcome = await this.cards.commitRedemption({
        storeId: input.storeId,
        giftCardId: card.id,
        expectedVersion: card.version,
        newBalance,
        newStatus,
        orderId: input.orderId,
        idempotencyKey: key,
        result,
      });
      if (outcome.kind === 'committed') return ok(result);
      if (outcome.kind === 'duplicate') return ok(outcome.result);
    }
    return err(new GiftCardValidationError('No se pudo redimir la gift card por concurrencia, reintenta'));
  }

  private async markExpiredIfNeeded(card: GiftCardProps): Promise<GiftCardNotRedeemableError | null> {
    // Orden importa: `disabled` no debe ser pisado a `expired` (perdería la
    // intención del admin). Para la rama de error tampoco persistimos: el
    // próximo intento volverá a entrar, y el primer `commitRedemption`
    // exitoso es quien fija el estado final (incluyendo el cambio a
    // `expired` cuando aplica).
    if (card.status === 'disabled') return new GiftCardNotRedeemableError('La gift card no se puede redimir en estado disabled');
    if (card.expiresAt && card.expiresAt <= new Date()) {
      return new GiftCardNotRedeemableError('La gift card está expirada');
    }
    if (card.status !== 'active') return new GiftCardNotRedeemableError(`La gift card no se puede redimir en estado ${card.status}`);
    if (card.balance <= 0) return new GiftCardNotRedeemableError('La gift card no tiene saldo disponible');
    return null;
  }
}

/**
 * Libera (restituye saldo) las redenciones activas asociadas a una orden. Se
 * dispara por `order.cancelled` / `order.refunded` desde el handler. Es
 * idempotente: `reversedAt` actúa como guarda; un segundo evento devuelve
 * cero releases sin tocar el saldo. Mantiene el `version` guard del puerto
 * para evitar perder mutaciones concurrentes (#1).
 */
export class ReleaseGiftCardForOrderUseCase implements UseCase<{ storeId: string; orderId: string }, Result<{ released: number; restoredAmount: number }, never>> {
  constructor(private readonly cards: GiftCardRepository) {}

  async execute(input: { storeId: string; orderId: string }): Promise<Result<{ released: number; restoredAmount: number }, never>> {
    const active = await this.cards.findActiveRedemptionsByOrder(input.storeId, input.orderId);
    let released = 0;
    let restoredAmount = 0;
    for (const record of active) {
      const result = await this.releaseOne(input.storeId, record.giftCardId, record.redemptionId, record.amount);
      if (result === 'released') {
        released += 1;
        restoredAmount = roundMoney(restoredAmount + record.amount);
      }
    }
    return ok({ released, restoredAmount });
  }

  private async releaseOne(storeId: string, giftCardId: string, redemptionId: string, amount: number): Promise<'released' | 'already_released' | 'failed'> {
    for (let attempt = 0; attempt < MAX_RELEASE_RETRIES; attempt += 1) {
      const card = await this.cards.findById(storeId, giftCardId);
      if (!card) return 'failed';
      const restoredBalance = roundMoney(card.balance + amount);
      const newStatus: GiftCardStatus = card.status === 'depleted' && restoredBalance > 0 ? 'active' : card.status;
      const outcome = await this.cards.releaseRedemption({
        storeId,
        redemptionId,
        giftCardId,
        expectedVersion: card.version,
        restoredBalance,
        newStatus,
      });
      if (outcome.kind === 'released') return 'released';
      if (outcome.kind === 'already_released') return 'already_released';
    }
    return 'failed';
  }
}

export class DisableGiftCardUseCase implements UseCase<{ storeId: string; id: string }, Result<GiftCardOutput, GiftCardNotFoundError>> {
  constructor(private readonly cards: GiftCardRepository) {}

  async execute(input: { storeId: string; id: string }): Promise<Result<GiftCardOutput, GiftCardNotFoundError>> {
    const card = await this.cards.findById(input.storeId, input.id);
    if (!card) return err(new GiftCardNotFoundError());
    card.status = 'disabled';
    card.updatedAt = new Date();
    await this.cards.save(card);
    return ok(toGiftCardOutput(card));
  }
}
