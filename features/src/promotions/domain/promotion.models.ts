export type DiscountType = 'percentage' | 'fixed';
export type DiscountScope = 'order' | 'product' | 'category';
export type NewsletterStatus = 'pending' | 'active' | 'unsubscribed';

export interface DiscountConditionProps {
  minimumSubtotal?: number | null;
  firstOrderOnly?: boolean;
  customerRoles?: string[];
}

export interface DiscountProps {
  id: string;
  storeId: string;
  name: string;
  type: DiscountType;
  value: number;
  maxDiscountAmount: number | null;
  scope: DiscountScope;
  targetIds: string[];
  conditions: DiscountConditionProps;
  requiresCoupon: boolean;
  combinable: boolean;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CouponProps {
  id: string;
  storeId: string;
  discountId: string;
  code: string;
  active: boolean;
  globalUsageLimit: number | null;
  perCustomerUsageLimit: number | null;
  usageCount: number;
  redemptionsByCustomer: Record<string, number>;
  version: number;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromotionLineInput {
  productId: string;
  categoryIds?: string[];
  quantity: number;
  unitPrice: number;
}

export interface DiscountEvaluationInput {
  storeId: string;
  customerId: string;
  subtotal: number;
  customerHasPreviousOrders?: boolean;
  customerRole?: string | null;
  couponCodes?: string[];
  lines: PromotionLineInput[];
  now?: Date;
}

export interface AppliedDiscount {
  discountId: string;
  couponId: string | null;
  amount: number;
  combinable: boolean;
}

export interface DiscountEvaluationOutput {
  appliedDiscounts: AppliedDiscount[];
  discountTotal: number;
}

export interface RewardProgramConfig {
  storeId: string;
  earnPointsPerCurrencyUnit: number;
  redeemCurrencyPerPoint: number;
  maxRedeemPercent: number | null;
  expiresAfterDays: number | null;
}

export interface RewardLedgerEntry {
  id: string;
  storeId: string;
  customerId: string;
  orderId: string | null;
  points: number;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface NewsletterSubscription {
  id: string;
  storeId: string;
  email: string;
  status: NewsletterStatus;
  confirmationToken: string;
  subscribedAt: Date;
  confirmedAt: Date | null;
  unsubscribedAt: Date | null;
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}
