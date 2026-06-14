import { buildIdempotencyKey, err, ok, roundMoney, type Result, type UseCase } from '@mitama/core';
import {
  CouponNotApplicableError,
  CouponNotFoundError,
  DiscountNotFoundError,
  NewsletterSubscriptionNotFoundError,
  PromotionValidationError,
  RewardProgramNotConfiguredError,
  TooManyCouponsError,
} from '../domain/errors';
import type { PromotionRepository } from '../domain/promotion.repository';
import {
  normalizeCode,
  type AppliedDiscount,
  type CouponProps,
  type DiscountEvaluationInput,
  type DiscountEvaluationOutput,
  type DiscountProps,
  type NewsletterStatus,
  type NewsletterSubscription,
  type RewardProgramConfig,
} from '../domain/promotion.models';
import { toCouponOutput, toDiscountOutput, toNewsletterOutput, type CouponOutput, type DiscountOutput, type NewsletterOutput, type PromotionPreviewOutput, type RewardProgramOutput } from './promotion.dto';

const MAX_COUPON_CODE_ATTEMPTS = 5;
const MAX_COUPON_REDEEM_RETRIES = 3;

export type CreateDiscountInput = Omit<DiscountProps, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateCouponInput = Omit<CouponProps, 'id' | 'code' | 'usageCount' | 'redemptionsByCustomer' | 'version' | 'createdAt' | 'updatedAt'> & { code: string };

export class CreateDiscountUseCase implements UseCase<CreateDiscountInput, Result<DiscountOutput, PromotionValidationError>> {
  constructor(private readonly promotions: PromotionRepository) {}

  async execute(input: CreateDiscountInput): Promise<Result<DiscountOutput, PromotionValidationError>> {
    if (input.value <= 0) return err(new PromotionValidationError('El valor del descuento debe ser mayor a cero'));
    if (input.type === 'percentage' && input.value > 100) return err(new PromotionValidationError('El porcentaje no puede superar 100'));
    if (input.startsAt && input.endsAt && input.startsAt > input.endsAt) return err(new PromotionValidationError('La vigencia del descuento es inválida'));
    const now = new Date();
    const discount: DiscountProps = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    await this.promotions.saveDiscount(discount);
    return ok(toDiscountOutput(discount));
  }
}

export class CreateCouponUseCase implements UseCase<CreateCouponInput, Result<CouponOutput, DiscountNotFoundError | PromotionValidationError>> {
  constructor(private readonly promotions: PromotionRepository) {}

  async execute(input: CreateCouponInput): Promise<Result<CouponOutput, DiscountNotFoundError | PromotionValidationError>> {
    const discount = await this.promotions.findDiscountById(input.storeId, input.discountId);
    if (!discount) return err(new DiscountNotFoundError(input.discountId));
    const code = normalizeCode(input.code);
    if (!code) return err(new PromotionValidationError('El código de cupón es obligatorio'));
    const now = new Date();
    const coupon: CouponProps = { ...input, code, id: crypto.randomUUID(), usageCount: 0, redemptionsByCustomer: {}, version: 0, createdAt: now, updatedAt: now };
    await this.promotions.saveCoupon(coupon);
    return ok(toCouponOutput(coupon));
  }
}

export class GenerateCouponsUseCase implements UseCase<CreateCouponInput & { quantity: number }, Result<CouponOutput[], DiscountNotFoundError | PromotionValidationError>> {
  constructor(private readonly createCoupon: CreateCouponUseCase, private readonly promotions: PromotionRepository) {}

  async execute(input: CreateCouponInput & { quantity: number }): Promise<Result<CouponOutput[], DiscountNotFoundError | PromotionValidationError>> {
    if (input.quantity < 1 || input.quantity > 1000) return err(new PromotionValidationError('La cantidad debe estar entre 1 y 1000'));
    const prefix = normalizeCode(input.code);
    const coupons: CouponOutput[] = [];
    for (let index = 0; index < input.quantity; index += 1) {
      const code = await this.allocateUniqueCode(input.storeId, prefix);
      if (!code) return err(new PromotionValidationError('No se pudo generar un código único de cupón'));
      const result = await this.createCoupon.execute({ ...input, code, globalUsageLimit: 1 });
      if (result.isErr()) return err(result.error);
      coupons.push(result.value);
    }
    return ok(coupons);
  }

  private async allocateUniqueCode(storeId: string, prefix: string): Promise<string | null> {
    for (let attempt = 0; attempt < MAX_COUPON_CODE_ATTEMPTS; attempt += 1) {
      const candidate = `${prefix}-${randomCodePart()}`;
      const existing = await this.promotions.findCouponByCode(storeId, candidate);
      if (!existing) return candidate;
    }
    return null;
  }
}

export class PreviewPromotionsUseCase implements UseCase<DiscountEvaluationInput, Result<PromotionPreviewOutput, TooManyCouponsError | CouponNotFoundError | CouponNotApplicableError>> {
  constructor(private readonly promotions: PromotionRepository) {}

  async execute(input: DiscountEvaluationInput): Promise<Result<PromotionPreviewOutput, TooManyCouponsError | CouponNotFoundError | CouponNotApplicableError>> {
    const result = await evaluatePromotions(this.promotions, input);
    if (result.isErr()) return err(result.error);
    return ok(result.value.output);
  }
}

export class RedeemCouponUseCase implements UseCase<DiscountEvaluationInput & { idempotencyKey: string }, Result<PromotionPreviewOutput, TooManyCouponsError | CouponNotFoundError | CouponNotApplicableError>> {
  constructor(private readonly promotions: PromotionRepository) {}

  async execute(input: DiscountEvaluationInput & { idempotencyKey: string }): Promise<Result<PromotionPreviewOutput, TooManyCouponsError | CouponNotFoundError | CouponNotApplicableError>> {
    const key = buildIdempotencyKey('coupon-redeem', input.idempotencyKey);
    const replay = await this.promotions.findIdempotency<PromotionPreviewOutput>(input.storeId, key);
    if (replay) return ok(replay.result);
    let lastErr: TooManyCouponsError | CouponNotFoundError | CouponNotApplicableError | null = null;
    for (let attempt = 0; attempt < MAX_COUPON_REDEEM_RETRIES; attempt += 1) {
      const evalResult = await evaluatePromotions(this.promotions, input);
      if (evalResult.isErr()) return err(evalResult.error);
      const { output, coupon } = evalResult.value;
      const consumes = coupon && output.appliedDiscounts.some((item) => item.couponId === coupon.id);
      if (!consumes) {
        await this.promotions.saveIdempotency(input.storeId, key, output);
        return ok(output);
      }
      const customerUsage = (coupon.redemptionsByCustomer[input.customerId] ?? 0) + 1;
      const outcome = await this.promotions.commitCouponRedemption<PromotionPreviewOutput>({
        storeId: input.storeId,
        couponId: coupon.id,
        expectedVersion: coupon.version,
        newUsageCount: coupon.usageCount + 1,
        newRedemptionsByCustomer: { ...coupon.redemptionsByCustomer, [input.customerId]: customerUsage },
        idempotencyKey: key,
        result: output,
      });
      if (outcome.kind === 'committed') return ok(output);
      if (outcome.kind === 'duplicate') return ok(outcome.result);
      // conflict: vuelve a leer cupón y revalidar límites antes de reintentar.
      lastErr = new CouponNotApplicableError('No se pudo confirmar el cupón por concurrencia');
    }
    return err(lastErr ?? new CouponNotApplicableError('No se pudo redimir el cupón'));
  }
}

export class ConfigureRewardProgramUseCase implements UseCase<RewardProgramConfig, Result<RewardProgramOutput, PromotionValidationError>> {
  constructor(private readonly promotions: PromotionRepository) {}

  async execute(input: RewardProgramConfig): Promise<Result<RewardProgramOutput, PromotionValidationError>> {
    if (input.earnPointsPerCurrencyUnit < 0 || input.redeemCurrencyPerPoint <= 0) return err(new PromotionValidationError('La configuración de puntos es inválida'));
    if (input.maxRedeemPercent !== null && (input.maxRedeemPercent <= 0 || input.maxRedeemPercent > 100)) return err(new PromotionValidationError('El tope de redención debe estar entre 1 y 100'));
    await this.promotions.saveRewardConfig(input);
    return ok(input);
  }
}

export class AccrueRewardPointsUseCase implements UseCase<{ storeId: string; customerId: string; orderId: string; paidAmount: number; idempotencyKey: string }, Result<{ points: number }, RewardProgramNotConfiguredError>> {
  constructor(private readonly promotions: PromotionRepository) {}

  async execute(input: { storeId: string; customerId: string; orderId: string; paidAmount: number; idempotencyKey: string }): Promise<Result<{ points: number }, RewardProgramNotConfiguredError>> {
    const key = buildIdempotencyKey('reward-accrue', input.idempotencyKey);
    const config = await this.promotions.findRewardConfig(input.storeId);
    if (!config) return err(new RewardProgramNotConfiguredError());
    const points = Math.floor(input.paidAmount * config.earnPointsPerCurrencyUnit);
    const expiresAt = config.expiresAfterDays === null ? null : new Date(Date.now() + config.expiresAfterDays * 24 * 60 * 60 * 1000);
    const output = { points };
    const outcome = await this.promotions.recordAccrualOnce<{ points: number }>({
      storeId: input.storeId,
      entry: { id: crypto.randomUUID(), storeId: input.storeId, customerId: input.customerId, orderId: input.orderId, points, expiresAt, createdAt: new Date() },
      idempotencyKey: key,
      result: output,
    });
    return outcome.kind === 'duplicate' ? ok(outcome.result) : ok(output);
  }
}

export class ReverseRewardPointsUseCase implements UseCase<{ storeId: string; customerId: string; orderId: string; points: number }, Result<{ points: number }, never>> {
  constructor(private readonly promotions: PromotionRepository) {}

  async execute(input: { storeId: string; customerId: string; orderId: string; points: number }): Promise<Result<{ points: number }, never>> {
    const key = buildIdempotencyKey('reward-reverse', input.orderId);
    const reversedPoints = -Math.abs(input.points);
    const output = { points: reversedPoints };
    const outcome = await this.promotions.recordAccrualOnce<{ points: number }>({
      storeId: input.storeId,
      entry: { id: crypto.randomUUID(), storeId: input.storeId, customerId: input.customerId, orderId: input.orderId, points: reversedPoints, expiresAt: null, createdAt: new Date() },
      idempotencyKey: key,
      result: output,
    });
    return outcome.kind === 'duplicate' ? ok(outcome.result) : ok(output);
  }
}

export class SubscribeNewsletterUseCase implements UseCase<{ storeId: string; email: string }, Result<NewsletterOutput, never>> {
  constructor(private readonly promotions: PromotionRepository) {}

  async execute(input: { storeId: string; email: string }): Promise<Result<NewsletterOutput, never>> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.promotions.findNewsletterByEmail(input.storeId, email);
    if (existing) {
      // Re-suscripción: si ya está activa, devolverla intacta (no degradar a
      // pending). Si está pending/unsubscribed, dejarla en pending preservando
      // el token original para que el link de confirmación previo siga válido.
      if (existing.status === 'active') return ok(toNewsletterOutput(existing));
      existing.status = 'pending';
      await this.promotions.saveNewsletter(existing);
      return ok(toNewsletterOutput(existing));
    }
    const subscription: NewsletterSubscription = {
      id: crypto.randomUUID(),
      storeId: input.storeId,
      email,
      status: 'pending',
      confirmationToken: crypto.randomUUID(),
      subscribedAt: new Date(),
      confirmedAt: null,
      unsubscribedAt: null,
    };
    await this.promotions.saveNewsletter(subscription);
    return ok(toNewsletterOutput(subscription));
  }
}

export class ConfirmNewsletterUseCase implements UseCase<{ token: string }, Result<NewsletterOutput, NewsletterSubscriptionNotFoundError>> {
  constructor(private readonly promotions: PromotionRepository) {}

  async execute(input: { token: string }): Promise<Result<NewsletterOutput, NewsletterSubscriptionNotFoundError>> {
    const subscription = await this.promotions.findNewsletterByToken(input.token);
    if (!subscription) return err(new NewsletterSubscriptionNotFoundError());
    subscription.status = 'active';
    subscription.confirmedAt = new Date();
    await this.promotions.saveNewsletter(subscription);
    return ok(toNewsletterOutput(subscription));
  }
}

export class UnsubscribeNewsletterUseCase implements UseCase<{ storeId: string; email: string }, Result<NewsletterOutput, NewsletterSubscriptionNotFoundError>> {
  constructor(private readonly promotions: PromotionRepository) {}

  async execute(input: { storeId: string; email: string }): Promise<Result<NewsletterOutput, NewsletterSubscriptionNotFoundError>> {
    const subscription = await this.promotions.findNewsletterByEmail(input.storeId, input.email.trim().toLowerCase());
    if (!subscription) return err(new NewsletterSubscriptionNotFoundError());
    subscription.status = 'unsubscribed';
    subscription.unsubscribedAt = new Date();
    await this.promotions.saveNewsletter(subscription);
    return ok(toNewsletterOutput(subscription));
  }
}

export class ExportNewsletterCsvUseCase implements UseCase<{ storeId: string; status?: NewsletterStatus }, Result<string, never>> {
  constructor(private readonly promotions: PromotionRepository) {}

  async execute(input: { storeId: string; status?: NewsletterStatus }): Promise<Result<string, never>> {
    const subscriptions = await this.promotions.listNewsletter(input.storeId, input.status);
    const rows = ['email,status,subscribedAt,confirmedAt,unsubscribedAt'];
    for (const subscription of subscriptions) rows.push([subscription.email, subscription.status, subscription.subscribedAt.toISOString(), subscription.confirmedAt?.toISOString() ?? '', subscription.unsubscribedAt?.toISOString() ?? ''].join(','));
    return ok(rows.join('\n'));
  }
}

interface EvaluatePromotionsResult {
  output: DiscountEvaluationOutput;
  coupon: CouponProps | null;
}

// Exporta para tests unitarios de combinabilidad (#2).
export { resolveCombinability };

async function evaluatePromotions(promotions: PromotionRepository, input: DiscountEvaluationInput): Promise<Result<EvaluatePromotionsResult, TooManyCouponsError | CouponNotFoundError | CouponNotApplicableError>> {
  const couponCodes = input.couponCodes?.filter(Boolean) ?? [];
  if (couponCodes.length > 1) return err(new TooManyCouponsError());
  const now = input.now ?? new Date();
  let coupon: CouponProps | null = null;
  if (couponCodes.length === 1) {
    const code = couponCodes[0];
    if (!code) return err(new CouponNotFoundError());
    coupon = await promotions.findCouponByCode(input.storeId, normalizeCode(code));
    if (!coupon) return err(new CouponNotFoundError());
    const couponError = validateCoupon(coupon, input.customerId, now);
    if (couponError) return err(couponError);
  }
  const discounts = (await promotions.findApplicableDiscounts(input.storeId, now)).filter((discount) => isDiscountApplicable(discount, input, coupon));
  const couponDiscount = coupon ? discounts.find((discount) => discount.id === coupon.discountId) ?? null : null;
  if (coupon && !couponDiscount) return err(new CouponNotApplicableError('El cupón no es aplicable a esta orden'));
  const candidates = discounts.filter((discount) => !discount.requiresCoupon || discount.id === coupon?.discountId);
  const applied = resolveCombinability(candidates.map((discount) => ({ discount, amount: calculateDiscountAmount(discount, input), couponId: coupon && discount.id === coupon.discountId ? coupon.id : null })).filter((item) => item.amount > 0));
  const output: DiscountEvaluationOutput = { appliedDiscounts: applied, discountTotal: roundMoney(applied.reduce((sum, item) => sum + item.amount, 0)) };
  return ok({ output, coupon });
}

function isDiscountApplicable(discount: DiscountProps, input: DiscountEvaluationInput, coupon: CouponProps | null): boolean {
  // active/startsAt/endsAt/storeId los empuja `findApplicableDiscounts` al WHERE.
  if (discount.requiresCoupon && coupon?.discountId !== discount.id) return false;
  if ((discount.conditions.minimumSubtotal ?? 0) > input.subtotal) return false;
  if (discount.conditions.firstOrderOnly && input.customerHasPreviousOrders) return false;
  if (discount.conditions.customerRoles?.length && !discount.conditions.customerRoles.includes(input.customerRole ?? '')) return false;
  return true;
}

function validateCoupon(coupon: CouponProps, customerId: string, now: Date): CouponNotApplicableError | null {
  if (!coupon.active) return new CouponNotApplicableError('El cupón está inactivo');
  if (coupon.startsAt && now < coupon.startsAt) return new CouponNotApplicableError('El cupón aún no está vigente');
  if (coupon.endsAt && now > coupon.endsAt) return new CouponNotApplicableError('El cupón está vencido');
  if (coupon.globalUsageLimit !== null && coupon.usageCount >= coupon.globalUsageLimit) return new CouponNotApplicableError('El cupón agotó su límite global');
  const customerUsage = coupon.redemptionsByCustomer[customerId] ?? 0;
  if (coupon.perCustomerUsageLimit !== null && customerUsage >= coupon.perCustomerUsageLimit) return new CouponNotApplicableError('El cliente alcanzó el límite de uso del cupón');
  return null;
}

function calculateDiscountAmount(discount: DiscountProps, input: DiscountEvaluationInput): number {
  const base = discount.scope === 'order' ? input.subtotal : input.lines.filter((line) => discount.scope === 'product' ? discount.targetIds.includes(line.productId) : (line.categoryIds ?? []).some((categoryId) => discount.targetIds.includes(categoryId))).reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const raw = discount.type === 'percentage' ? base * (discount.value / 100) : Math.min(discount.value, base);
  return roundMoney(Math.min(raw, discount.maxDiscountAmount ?? raw));
}

// Regla 7 (spec): gana el conjunto de mayor beneficio total; los combinables
// se suman entre sí y compiten como un único bloque contra el mejor
// no-combinable individual. Empate → combinables ganan (incentiva combinar).
// Un cupón cuyo descuento pierde frente a un combinable mayor NO se consume
// (aplica 0); es el costo de elegir el mayor beneficio para el cliente.
function resolveCombinability(items: Array<{ discount: DiscountProps; amount: number; couponId: string | null }>): AppliedDiscount[] {
  if (items.length === 0) return [];
  const combinables = items.filter((item) => item.discount.combinable);
  const nonCombinables = items.filter((item) => !item.discount.combinable);
  const sumCombinables = combinables.reduce((sum, item) => sum + item.amount, 0);
  const bestNonCombinable = nonCombinables.length > 0 ? [...nonCombinables].sort((a, b) => b.amount - a.amount || a.discount.id.localeCompare(b.discount.id))[0] : null;
  if (bestNonCombinable && bestNonCombinable.amount > sumCombinables) return [toAppliedDiscount(bestNonCombinable)];
  return combinables.map(toAppliedDiscount).sort(byDiscountId);
}

function toAppliedDiscount(item: { discount: DiscountProps; amount: number; couponId: string | null }): AppliedDiscount {
  return { discountId: item.discount.id, couponId: item.couponId, amount: item.amount, combinable: item.discount.combinable };
}

function byDiscountId(a: AppliedDiscount, b: AppliedDiscount): number {
  return a.discountId.localeCompare(b.discountId);
}

function randomCodePart(): string {
  return crypto.randomUUID().slice(0, 8).toUpperCase();
}
