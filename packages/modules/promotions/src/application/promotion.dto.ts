import type { CouponProps, DiscountEvaluationOutput, DiscountProps, NewsletterSubscription, RewardProgramConfig } from '../domain/promotion.models';

export type DiscountOutput = Omit<DiscountProps, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string };
export type CouponOutput = Omit<CouponProps, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string };
export type PromotionPreviewOutput = DiscountEvaluationOutput;
export type RewardProgramOutput = RewardProgramConfig;
export type NewsletterOutput = Omit<NewsletterSubscription, 'subscribedAt' | 'confirmedAt' | 'unsubscribedAt'> & {
  subscribedAt: string;
  confirmedAt: string | null;
  unsubscribedAt: string | null;
};

export function toDiscountOutput(discount: DiscountProps): DiscountOutput {
  return { ...discount, createdAt: discount.createdAt.toISOString(), updatedAt: discount.updatedAt.toISOString() };
}

export function toCouponOutput(coupon: CouponProps): CouponOutput {
  return { ...coupon, createdAt: coupon.createdAt.toISOString(), updatedAt: coupon.updatedAt.toISOString() };
}

export function toNewsletterOutput(subscription: NewsletterSubscription): NewsletterOutput {
  return {
    ...subscription,
    subscribedAt: subscription.subscribedAt.toISOString(),
    confirmedAt: subscription.confirmedAt?.toISOString() ?? null,
    unsubscribedAt: subscription.unsubscribedAt?.toISOString() ?? null,
  };
}
