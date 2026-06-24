import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@mitama/data';
import type { CouponCommitOutcome, CouponCommitRedemptionInput, PromotionIdempotencyRecord, PromotionRepository, RewardAccrualInput, RewardAccrualOutcome } from '../domain/promotion.repository';
import { normalizeCode, type CouponProps, type DiscountConditionProps, type DiscountProps, type DiscountScope, type DiscountType, type NewsletterStatus, type NewsletterSubscription, type RewardLedgerEntry, type RewardProgramConfig } from '../domain/promotion.models';

@Injectable()
export class PrismaPromotionRepository implements PromotionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async saveDiscount(discount: DiscountProps): Promise<void> {
    await this.prisma.promotionDiscount.upsert({ where: { id: discount.id }, create: toDiscountRow(discount), update: toDiscountRow(discount) });
  }

  async findDiscountById(storeId: string, id: string): Promise<DiscountProps | null> {
    const row = await this.prisma.promotionDiscount.findFirst({ where: { id, storeId } });
    return row ? toDiscountDomain(row) : null;
  }

  async findDiscounts(storeId: string): Promise<DiscountProps[]> {
    const rows = await this.prisma.promotionDiscount.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' } });
    return rows.map(toDiscountDomain);
  }

  async findApplicableDiscounts(storeId: string, now: Date): Promise<DiscountProps[]> {
    const rows = await this.prisma.promotionDiscount.findMany({
      where: {
        storeId,
        active: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDiscountDomain);
  }

  async saveCoupon(coupon: CouponProps): Promise<void> {
    await this.prisma.promotionCoupon.upsert({ where: { storeId_code: { storeId: coupon.storeId, code: coupon.code } }, create: toCouponRow(coupon), update: toCouponRow(coupon) });
  }

  async findCouponByCode(storeId: string, code: string): Promise<CouponProps | null> {
    const row = await this.prisma.promotionCoupon.findUnique({ where: { storeId_code: { storeId, code: normalizeCode(code) } } });
    return row ? toCouponDomain(row) : null;
  }

  async findCouponsByDiscount(storeId: string, discountId: string): Promise<CouponProps[]> {
    const rows = await this.prisma.promotionCoupon.findMany({ where: { storeId, discountId } });
    return rows.map(toCouponDomain);
  }

  async commitCouponRedemption<T>(input: CouponCommitRedemptionInput<T>): Promise<CouponCommitOutcome<T>> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        try {
          await tx.promotionIdempotencyKey.create({
            data: { storeId: input.storeId, key: input.idempotencyKey, result: input.result as Prisma.InputJsonValue },
          });
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            const existing = await tx.promotionIdempotencyKey.findUnique({ where: { storeId_key: { storeId: input.storeId, key: input.idempotencyKey } } });
            return { kind: 'duplicate', result: (existing?.result ?? input.result) as T };
          }
          throw error;
        }
        const updated = await tx.promotionCoupon.updateMany({
          where: { id: input.couponId, storeId: input.storeId, version: input.expectedVersion },
          data: {
            usageCount: input.newUsageCount,
            redemptionsByCustomer: input.newRedemptionsByCustomer as Prisma.InputJsonValue,
            version: { increment: 1 },
            updatedAt: new Date(),
          },
        });
        if (updated.count !== 1) throw new CouponVersionConflictError();
        return { kind: 'committed' };
      });
    } catch (error) {
      if (error instanceof CouponVersionConflictError) return { kind: 'conflict' };
      throw error;
    }
  }

  async saveRewardConfig(config: RewardProgramConfig): Promise<void> {
    await this.prisma.rewardProgramConfig.upsert({
      where: { storeId: config.storeId },
      create: toRewardConfigRow(config),
      update: toRewardConfigRow(config),
    });
  }

  async findRewardConfig(storeId: string): Promise<RewardProgramConfig | null> {
    const row = await this.prisma.rewardProgramConfig.findUnique({ where: { storeId } });
    return row ? { storeId: row.storeId, earnPointsPerCurrencyUnit: Number(row.earnPointsPerCurrencyUnit), redeemCurrencyPerPoint: Number(row.redeemCurrencyPerPoint), maxRedeemPercent: row.maxRedeemPercent === null ? null : Number(row.maxRedeemPercent), expiresAfterDays: row.expiresAfterDays } : null;
  }

  async recordAccrualOnce<T>(input: RewardAccrualInput<T>): Promise<RewardAccrualOutcome<T>> {
    return this.prisma.$transaction(async (tx) => {
      try {
        await tx.promotionIdempotencyKey.create({
          data: { storeId: input.storeId, key: input.idempotencyKey, result: input.result as Prisma.InputJsonValue },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const existing = await tx.promotionIdempotencyKey.findUnique({ where: { storeId_key: { storeId: input.storeId, key: input.idempotencyKey } } });
          return { kind: 'duplicate', result: (existing?.result ?? input.result) as T };
        }
        throw error;
      }
      await tx.rewardLedgerEntry.create({ data: input.entry });
      return { kind: 'committed' };
    });
  }

  async findRewardLedger(storeId: string, customerId: string): Promise<RewardLedgerEntry[]> {
    return this.prisma.rewardLedgerEntry.findMany({ where: { storeId, customerId }, orderBy: { createdAt: 'asc' } });
  }

  async saveIdempotency<T>(storeId: string, key: string, result: T): Promise<void> {
    await this.prisma.promotionIdempotencyKey.upsert({
      where: { storeId_key: { storeId, key } },
      create: { storeId, key, result: result as Prisma.InputJsonValue },
      update: {},
    });
  }

  async findIdempotency<T>(storeId: string, key: string): Promise<PromotionIdempotencyRecord<T> | null> {
    const row = await this.prisma.promotionIdempotencyKey.findUnique({ where: { storeId_key: { storeId, key } } });
    return row ? { storeId: row.storeId, key: row.key, result: row.result as T } : null;
  }

  async saveNewsletter(subscription: NewsletterSubscription): Promise<void> {
    await this.prisma.newsletterSubscription.upsert({ where: { storeId_email: { storeId: subscription.storeId, email: subscription.email } }, create: subscription, update: subscription });
  }

  async findNewsletterByEmail(storeId: string, email: string): Promise<NewsletterSubscription | null> {
    const row = await this.prisma.newsletterSubscription.findUnique({ where: { storeId_email: { storeId, email: email.trim().toLowerCase() } } });
    return row ? toNewsletterDomain(row) : null;
  }

  async findNewsletterByToken(token: string): Promise<NewsletterSubscription | null> {
    const row = await this.prisma.newsletterSubscription.findUnique({ where: { confirmationToken: token } });
    return row ? toNewsletterDomain(row) : null;
  }

  async listNewsletter(storeId: string, status?: NewsletterStatus): Promise<NewsletterSubscription[]> {
    const rows = await this.prisma.newsletterSubscription.findMany({ where: { storeId, status }, orderBy: { subscribedAt: 'desc' } });
    return rows.map(toNewsletterDomain);
  }
}

class CouponVersionConflictError extends Error {
  constructor() {
    super('promotion coupon version conflict');
  }
}

function toDiscountRow(discount: DiscountProps) {
  return {
    id: discount.id,
    storeId: discount.storeId,
    name: discount.name,
    type: discount.type,
    value: discount.value,
    maxDiscountAmount: discount.maxDiscountAmount,
    scope: discount.scope,
    targetIds: discount.targetIds,
    conditions: discount.conditions as Prisma.InputJsonValue,
    requiresCoupon: discount.requiresCoupon,
    combinable: discount.combinable,
    active: discount.active,
    startsAt: discount.startsAt,
    endsAt: discount.endsAt,
    createdAt: discount.createdAt,
    updatedAt: discount.updatedAt,
  };
}

function toDiscountDomain(row: { id: string; storeId: string; name: string; type: string; value: unknown; maxDiscountAmount: unknown | null; scope: string; targetIds: unknown; conditions: unknown; requiresCoupon: boolean; combinable: boolean; active: boolean; startsAt: Date | null; endsAt: Date | null; createdAt: Date; updatedAt: Date }): DiscountProps {
  return { ...row, type: row.type as DiscountType, value: Number(row.value), maxDiscountAmount: row.maxDiscountAmount === null ? null : Number(row.maxDiscountAmount), scope: row.scope as DiscountScope, targetIds: Array.isArray(row.targetIds) ? row.targetIds.filter((item): item is string => typeof item === 'string') : [], conditions: parseConditions(row.conditions) };
}

function toCouponRow(coupon: CouponProps) {
  return {
    id: coupon.id,
    storeId: coupon.storeId,
    discountId: coupon.discountId,
    code: coupon.code,
    active: coupon.active,
    globalUsageLimit: coupon.globalUsageLimit,
    perCustomerUsageLimit: coupon.perCustomerUsageLimit,
    usageCount: coupon.usageCount,
    redemptionsByCustomer: coupon.redemptionsByCustomer,
    version: coupon.version,
    startsAt: coupon.startsAt,
    endsAt: coupon.endsAt,
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
  };
}

function toCouponDomain(row: { id: string; storeId: string; discountId: string; code: string; active: boolean; globalUsageLimit: number | null; perCustomerUsageLimit: number | null; usageCount: number; redemptionsByCustomer: unknown; version: number; startsAt: Date | null; endsAt: Date | null; createdAt: Date; updatedAt: Date }): CouponProps {
  return { ...row, redemptionsByCustomer: parseCustomerRedemptions(row.redemptionsByCustomer) };
}

function toRewardConfigRow(config: RewardProgramConfig) {
  return { storeId: config.storeId, earnPointsPerCurrencyUnit: config.earnPointsPerCurrencyUnit, redeemCurrencyPerPoint: config.redeemCurrencyPerPoint, maxRedeemPercent: config.maxRedeemPercent, expiresAfterDays: config.expiresAfterDays };
}

function toNewsletterDomain(row: { id: string; storeId: string; email: string; status: string; confirmationToken: string; subscribedAt: Date; confirmedAt: Date | null; unsubscribedAt: Date | null }): NewsletterSubscription {
  return { ...row, status: row.status as NewsletterStatus };
}

function parseConditions(value: unknown): DiscountConditionProps {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  return {
    minimumSubtotal: typeof raw.minimumSubtotal === 'number' ? raw.minimumSubtotal : null,
    firstOrderOnly: raw.firstOrderOnly === true,
    customerRoles: Array.isArray(raw.customerRoles) ? raw.customerRoles.filter((role): role is string => typeof role === 'string') : undefined,
  };
}

function parseCustomerRedemptions(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === 'number'));
}
