import type { CouponProps, DiscountProps, NewsletterStatus, NewsletterSubscription, RewardLedgerEntry, RewardProgramConfig } from './promotion.models';

export interface PromotionIdempotencyRecord<T> {
  storeId: string;
  key: string;
  result: T;
}

export interface CouponCommitRedemptionInput<T> {
  storeId: string;
  couponId: string;
  expectedVersion: number;
  newUsageCount: number;
  newRedemptionsByCustomer: Record<string, number>;
  idempotencyKey: string;
  result: T;
}

export type CouponCommitOutcome<T> =
  | { kind: 'committed' }
  | { kind: 'duplicate'; result: T }
  | { kind: 'conflict' };

export interface RewardAccrualInput<T> {
  storeId: string;
  entry: RewardLedgerEntry;
  idempotencyKey: string;
  result: T;
}

export type RewardAccrualOutcome<T> =
  | { kind: 'committed' }
  | { kind: 'duplicate'; result: T };

export interface PromotionRepository {
  saveDiscount(discount: DiscountProps): Promise<void>;
  findDiscountById(storeId: string, id: string): Promise<DiscountProps | null>;
  findDiscounts(storeId: string): Promise<DiscountProps[]>;
  /**
   * Descuentos activos y vigentes para `now`. Empuja `active`/`startsAt`/`endsAt`
   * al WHERE para evitar traer todos los descuentos y filtrar en memoria.
   */
  findApplicableDiscounts(storeId: string, now: Date): Promise<DiscountProps[]>;
  saveCoupon(coupon: CouponProps): Promise<void>;
  findCouponByCode(storeId: string, code: string): Promise<CouponProps | null>;
  findCouponsByDiscount(storeId: string, discountId: string): Promise<CouponProps[]>;
  commitCouponRedemption<T>(input: CouponCommitRedemptionInput<T>): Promise<CouponCommitOutcome<T>>;
  saveRewardConfig(config: RewardProgramConfig): Promise<void>;
  findRewardConfig(storeId: string): Promise<RewardProgramConfig | null>;
  recordAccrualOnce<T>(input: RewardAccrualInput<T>): Promise<RewardAccrualOutcome<T>>;
  findRewardLedger(storeId: string, customerId: string): Promise<RewardLedgerEntry[]>;
  saveIdempotency<T>(storeId: string, key: string, result: T): Promise<void>;
  findIdempotency<T>(storeId: string, key: string): Promise<PromotionIdempotencyRecord<T> | null>;
  saveNewsletter(subscription: NewsletterSubscription): Promise<void>;
  findNewsletterByEmail(storeId: string, email: string): Promise<NewsletterSubscription | null>;
  findNewsletterByToken(token: string): Promise<NewsletterSubscription | null>;
  listNewsletter(storeId: string, status?: NewsletterStatus): Promise<NewsletterSubscription[]>;
}
