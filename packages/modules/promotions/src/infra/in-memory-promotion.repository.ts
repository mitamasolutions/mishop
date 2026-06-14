import { Injectable } from '@nestjs/common';
import type { CouponCommitOutcome, CouponCommitRedemptionInput, PromotionIdempotencyRecord, PromotionRepository, RewardAccrualInput, RewardAccrualOutcome } from '../domain/promotion.repository';
import { normalizeCode, type CouponProps, type DiscountProps, type NewsletterStatus, type NewsletterSubscription, type RewardLedgerEntry, type RewardProgramConfig } from '../domain/promotion.models';

@Injectable()
export class InMemoryPromotionRepository implements PromotionRepository {
  private readonly discounts = new Map<string, DiscountProps>();
  private readonly coupons = new Map<string, CouponProps>();
  private readonly couponsById = new Map<string, string>();
  private readonly rewardConfigs = new Map<string, RewardProgramConfig>();
  private readonly rewardLedger: RewardLedgerEntry[] = [];
  private readonly idempotency = new Map<string, PromotionIdempotencyRecord<unknown>>();
  private readonly newsletters = new Map<string, NewsletterSubscription>();

  async saveDiscount(discount: DiscountProps): Promise<void> {
    this.discounts.set(discount.id, cloneDiscount(discount));
  }

  async findDiscountById(storeId: string, id: string): Promise<DiscountProps | null> {
    const discount = this.discounts.get(id);
    return discount?.storeId === storeId ? cloneDiscount(discount) : null;
  }

  async findDiscounts(storeId: string): Promise<DiscountProps[]> {
    return [...this.discounts.values()].filter((discount) => discount.storeId === storeId).map(cloneDiscount);
  }

  async findApplicableDiscounts(storeId: string, now: Date): Promise<DiscountProps[]> {
    return [...this.discounts.values()]
      .filter((discount) => discount.storeId === storeId && discount.active && (!discount.startsAt || discount.startsAt <= now) && (!discount.endsAt || discount.endsAt >= now))
      .map(cloneDiscount);
  }

  async saveCoupon(coupon: CouponProps): Promise<void> {
    const key = couponKey(coupon.storeId, coupon.code);
    this.coupons.set(key, cloneCoupon(coupon));
    this.couponsById.set(coupon.id, key);
  }

  async findCouponByCode(storeId: string, code: string): Promise<CouponProps | null> {
    const coupon = this.coupons.get(couponKey(storeId, normalizeCode(code)));
    return coupon ? cloneCoupon(coupon) : null;
  }

  async findCouponsByDiscount(storeId: string, discountId: string): Promise<CouponProps[]> {
    return [...this.coupons.values()].filter((coupon) => coupon.storeId === storeId && coupon.discountId === discountId).map(cloneCoupon);
  }

  // Compare-and-set síncrono sobre `version`: no introducir awaits entre la
  // comprobación de idempotencia y la mutación del cupón.
  async commitCouponRedemption<T>(input: CouponCommitRedemptionInput<T>): Promise<CouponCommitOutcome<T>> {
    const idemKey = idempotencyKey(input.storeId, input.idempotencyKey);
    const existing = this.idempotency.get(idemKey);
    if (existing) return { kind: 'duplicate', result: existing.result as T };
    const storedKey = this.couponsById.get(input.couponId);
    const coupon = storedKey ? this.coupons.get(storedKey) : null;
    if (!coupon || coupon.storeId !== input.storeId) return { kind: 'conflict' };
    if (coupon.version !== input.expectedVersion) return { kind: 'conflict' };
    coupon.usageCount = input.newUsageCount;
    coupon.redemptionsByCustomer = { ...input.newRedemptionsByCustomer };
    coupon.version += 1;
    coupon.updatedAt = new Date();
    this.idempotency.set(idemKey, { storeId: input.storeId, key: input.idempotencyKey, result: input.result });
    return { kind: 'committed' };
  }

  async saveRewardConfig(config: RewardProgramConfig): Promise<void> {
    this.rewardConfigs.set(config.storeId, { ...config });
  }

  async findRewardConfig(storeId: string): Promise<RewardProgramConfig | null> {
    const config = this.rewardConfigs.get(storeId);
    return config ? { ...config } : null;
  }

  // Inserta ledger + clave de idempotencia atómicamente (mismo race que en
  // Prisma: P2002 sobre `PromotionIdempotencyKey` → no inserta ledger).
  async recordAccrualOnce<T>(input: RewardAccrualInput<T>): Promise<RewardAccrualOutcome<T>> {
    const idemKey = idempotencyKey(input.storeId, input.idempotencyKey);
    const existing = this.idempotency.get(idemKey);
    if (existing) return { kind: 'duplicate', result: existing.result as T };
    this.idempotency.set(idemKey, { storeId: input.storeId, key: input.idempotencyKey, result: input.result });
    this.rewardLedger.push({ ...input.entry });
    return { kind: 'committed' };
  }

  async findRewardLedger(storeId: string, customerId: string): Promise<RewardLedgerEntry[]> {
    return this.rewardLedger.filter((entry) => entry.storeId === storeId && entry.customerId === customerId).map((entry) => ({ ...entry }));
  }

  async saveIdempotency<T>(storeId: string, key: string, result: T): Promise<void> {
    const idemKey = idempotencyKey(storeId, key);
    if (this.idempotency.has(idemKey)) return;
    this.idempotency.set(idemKey, { storeId, key, result });
  }

  async findIdempotency<T>(storeId: string, key: string): Promise<PromotionIdempotencyRecord<T> | null> {
    return (this.idempotency.get(idempotencyKey(storeId, key)) as PromotionIdempotencyRecord<T> | undefined) ?? null;
  }

  async saveNewsletter(subscription: NewsletterSubscription): Promise<void> {
    this.newsletters.set(newsletterKey(subscription.storeId, subscription.email), { ...subscription });
  }

  async findNewsletterByEmail(storeId: string, email: string): Promise<NewsletterSubscription | null> {
    const subscription = this.newsletters.get(newsletterKey(storeId, email));
    return subscription ? { ...subscription } : null;
  }

  async findNewsletterByToken(token: string): Promise<NewsletterSubscription | null> {
    const subscription = [...this.newsletters.values()].find((item) => item.confirmationToken === token);
    return subscription ? { ...subscription } : null;
  }

  async listNewsletter(storeId: string, status?: NewsletterStatus): Promise<NewsletterSubscription[]> {
    return [...this.newsletters.values()].filter((item) => item.storeId === storeId && (!status || item.status === status)).map((item) => ({ ...item }));
  }
}

function couponKey(storeId: string, code: string): string {
  return `${storeId}:${code}`;
}

function idempotencyKey(storeId: string, key: string): string {
  return `${storeId}:${key}`;
}

function newsletterKey(storeId: string, email: string): string {
  return `${storeId}:${email.trim().toLowerCase()}`;
}

function cloneDiscount(discount: DiscountProps): DiscountProps {
  return { ...discount, targetIds: [...discount.targetIds], conditions: { ...discount.conditions, customerRoles: discount.conditions.customerRoles ? [...discount.conditions.customerRoles] : undefined } };
}

function cloneCoupon(coupon: CouponProps): CouponProps {
  return { ...coupon, redemptionsByCustomer: { ...coupon.redemptionsByCustomer } };
}
