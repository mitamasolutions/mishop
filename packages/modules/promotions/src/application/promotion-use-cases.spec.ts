import { describe, expect, it } from 'vitest';
import type { DiscountProps } from '../domain/promotion.models';
import { InMemoryPromotionRepository } from '../infra/in-memory-promotion.repository';
import {
  AccrueRewardPointsUseCase,
  ConfigureRewardProgramUseCase,
  ConfirmNewsletterUseCase,
  CreateCouponUseCase,
  CreateDiscountUseCase,
  GenerateCouponsUseCase,
  PreviewPromotionsUseCase,
  RedeemCouponUseCase,
  ReverseRewardPointsUseCase,
  resolveCombinability,
  SubscribeNewsletterUseCase,
} from './promotion-use-cases';

describe('promotions use cases', () => {
  it('aplica solo el mayor descuento no combinable y respeta topes', async () => {
    const repo = new InMemoryPromotionRepository();
    const createDiscount = new CreateDiscountUseCase(repo);
    const preview = new PreviewPromotionsUseCase(repo);
    await createDiscount.execute(discount({ name: '10%', type: 'percentage', value: 10, maxDiscountAmount: 15 }));
    await createDiscount.execute(discount({ name: '$20', type: 'fixed', value: 20, maxDiscountAmount: 12 }));

    const result = await preview.execute(context({ subtotal: 200 }));

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.discountTotal).toBe(15);
      expect(result.value.appliedDiscounts).toHaveLength(1);
    }
  });

  it('suma descuentos combinables y filtra alcance de categoria', async () => {
    const repo = new InMemoryPromotionRepository();
    const createDiscount = new CreateDiscountUseCase(repo);
    const first = await createDiscount.execute(discount({ name: 'categoria', type: 'percentage', value: 10, scope: 'category', targetIds: ['cat-a'], combinable: true }));
    const second = await createDiscount.execute(discount({ name: 'orden', type: 'fixed', value: 5, combinable: true }));
    expect(first.isOk() && second.isOk()).toBe(true);

    const result = await new PreviewPromotionsUseCase(repo).execute(context());

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.discountTotal).toBe(15);
  });

  it('normaliza cupón, valida límites e idempotencia', async () => {
    const repo = new InMemoryPromotionRepository();
    const discountResult = await new CreateDiscountUseCase(repo).execute(discount({ requiresCoupon: true, value: 25 }));
    expect(discountResult.isOk()).toBe(true);
    if (!discountResult.isOk()) return;
    await new CreateCouponUseCase(repo).execute({ storeId: 'store-1', discountId: discountResult.value.id, code: ' promo ', active: true, globalUsageLimit: 1, perCustomerUsageLimit: 1, startsAt: null, endsAt: null });
    const redeem = new RedeemCouponUseCase(repo);

    const first = await redeem.execute({ ...context(), couponCodes: ['promo'], idempotencyKey: 'idem-1' });
    const replay = await redeem.execute({ ...context(), couponCodes: ['PROMO'], idempotencyKey: 'idem-1' });
    const second = await redeem.execute({ ...context({ customerId: 'customer-2' }), couponCodes: ['PROMO'], idempotencyKey: 'idem-2' });

    expect(first.isOk()).toBe(true);
    expect(replay.isOk()).toBe(true);
    expect(second.isErr()).toBe(true);
    if (first.isOk() && replay.isOk()) expect(replay.value).toEqual(first.value);
  });

  it('acredita puntos de forma idempotente', async () => {
    const repo = new InMemoryPromotionRepository();
    await new ConfigureRewardProgramUseCase(repo).execute({ storeId: 'store-1', earnPointsPerCurrencyUnit: 2, redeemCurrencyPerPoint: 0.5, maxRedeemPercent: 50, expiresAfterDays: null });
    const accrue = new AccrueRewardPointsUseCase(repo);
    const first = await accrue.execute({ storeId: 'store-1', customerId: 'customer-1', orderId: 'order-1', paidAmount: 100, idempotencyKey: 'points-1' });
    const replay = await accrue.execute({ storeId: 'store-1', customerId: 'customer-1', orderId: 'order-1', paidAmount: 100, idempotencyKey: 'points-1' });

    expect(first.isOk() && replay.isOk()).toBe(true);
    if (first.isOk() && replay.isOk()) {
      expect(first.value.points).toBe(200);
      expect(replay.value).toEqual(first.value);
    }
    const ledger = await repo.findRewardLedger('store-1', 'customer-1');
    expect(ledger).toHaveLength(1);
  });

  it('cupón sobre descuento automático+combinable no duplica el total', async () => {
    const repo = new InMemoryPromotionRepository();
    const created = await new CreateDiscountUseCase(repo).execute(discount({ name: '10%', type: 'percentage', value: 10, combinable: true, requiresCoupon: false }));
    expect(created.isOk()).toBe(true);
    if (!created.isOk()) return;
    await new CreateCouponUseCase(repo).execute({ storeId: 'store-1', discountId: created.value.id, code: 'EXTRA', active: true, globalUsageLimit: null, perCustomerUsageLimit: null, startsAt: null, endsAt: null });

    const preview = await new PreviewPromotionsUseCase(repo).execute({ ...context(), couponCodes: ['EXTRA'] });

    expect(preview.isOk()).toBe(true);
    if (preview.isOk()) {
      expect(preview.value.appliedDiscounts).toHaveLength(1);
      expect(preview.value.discountTotal).toBe(10);
    }
  });

  it('re-suscripción de un newsletter active no lo degrada a pending', async () => {
    const repo = new InMemoryPromotionRepository();
    const subscribe = new SubscribeNewsletterUseCase(repo);
    const initial = await subscribe.execute({ storeId: 'store-1', email: 'cliente@mail.com' });
    expect(initial.isOk()).toBe(true);
    if (!initial.isOk()) return;
    await new ConfirmNewsletterUseCase(repo).execute({ token: initial.value.confirmationToken });

    const retry = await subscribe.execute({ storeId: 'store-1', email: 'CLIENTE@MAIL.COM' });

    expect(retry.isOk()).toBe(true);
    if (retry.isOk()) expect(retry.value.status).toBe('active');
    const stored = await repo.findNewsletterByEmail('store-1', 'cliente@mail.com');
    expect(stored?.status).toBe('active');
  });

  it('reverse de reward points es idempotente por orderId', async () => {
    const repo = new InMemoryPromotionRepository();
    const reverse = new ReverseRewardPointsUseCase(repo);
    const first = await reverse.execute({ storeId: 'store-1', customerId: 'customer-1', orderId: 'order-9', points: 50 });
    const replay = await reverse.execute({ storeId: 'store-1', customerId: 'customer-1', orderId: 'order-9', points: 50 });

    expect(first.isOk() && replay.isOk()).toBe(true);
    if (first.isOk() && replay.isOk()) expect(replay.value).toEqual(first.value);
    const ledger = await repo.findRewardLedger('store-1', 'customer-1');
    expect(ledger).toHaveLength(1);
    expect(ledger[0]?.points).toBe(-50);
  });

  it('reusar Idempotency-Key entre accrue y redeem-coupon no cruza resultados', async () => {
    const repo = new InMemoryPromotionRepository();
    await new ConfigureRewardProgramUseCase(repo).execute({ storeId: 'store-1', earnPointsPerCurrencyUnit: 1, redeemCurrencyPerPoint: 1, maxRedeemPercent: null, expiresAfterDays: null });
    const accrued = await new AccrueRewardPointsUseCase(repo).execute({ storeId: 'store-1', customerId: 'customer-1', orderId: 'order-1', paidAmount: 50, idempotencyKey: 'shared-key' });

    const discountResult = await new CreateDiscountUseCase(repo).execute(discount({ requiresCoupon: true, value: 10 }));
    expect(discountResult.isOk()).toBe(true);
    if (!discountResult.isOk()) return;
    await new CreateCouponUseCase(repo).execute({ storeId: 'store-1', discountId: discountResult.value.id, code: 'SHARED', active: true, globalUsageLimit: null, perCustomerUsageLimit: null, startsAt: null, endsAt: null });

    const redeemed = await new RedeemCouponUseCase(repo).execute({ ...context(), couponCodes: ['SHARED'], idempotencyKey: 'shared-key' });

    expect(accrued.isOk() && redeemed.isOk()).toBe(true);
    if (accrued.isOk() && redeemed.isOk()) {
      expect(accrued.value).toEqual({ points: 50 });
      expect(redeemed.value.discountTotal).toBeGreaterThan(0);
      expect(redeemed.value).not.toEqual(accrued.value);
    }
  });

  it('generación masiva produce N códigos únicos', async () => {
    const repo = new InMemoryPromotionRepository();
    const discountResult = await new CreateDiscountUseCase(repo).execute(discount({ requiresCoupon: true, value: 5 }));
    expect(discountResult.isOk()).toBe(true);
    if (!discountResult.isOk()) return;
    const generator = new GenerateCouponsUseCase(new CreateCouponUseCase(repo), repo);

    const result = await generator.execute({ storeId: 'store-1', discountId: discountResult.value.id, code: 'BULK', active: true, globalUsageLimit: null, perCustomerUsageLimit: null, startsAt: null, endsAt: null, quantity: 25 });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(25);
      expect(new Set(result.value.map((coupon) => coupon.code)).size).toBe(25);
    }
  });

  it('newsletter usa doble opt-in y exporta solo activas', async () => {
    const repo = new InMemoryPromotionRepository();
    const subscription = await new SubscribeNewsletterUseCase(repo).execute({ storeId: 'store-1', email: 'CLIENTE@MAIL.COM' });
    expect(subscription.isOk()).toBe(true);
    if (!subscription.isOk()) return;
    await new ConfirmNewsletterUseCase(repo).execute({ token: subscription.value.confirmationToken });
    const csv = await repo.listNewsletter('store-1', 'active');

    expect(csv).toHaveLength(1);
    expect(csv[0]?.email).toBe('cliente@mail.com');
  });

  describe('resolveCombinability (#2)', () => {
    it('combinables ganan cuando su suma supera al mejor no-combinable', () => {
      const result = resolveCombinability([
        { discount: combinableDiscount('c1', true), amount: 10, couponId: null },
        { discount: combinableDiscount('c2', true), amount: 8, couponId: null },
        { discount: combinableDiscount('n1', false), amount: 12, couponId: null },
      ]);
      expect(result.map((item) => item.discountId).sort()).toEqual(['c1', 'c2']);
      expect(result.reduce((sum, item) => sum + item.amount, 0)).toBe(18);
    });

    it('mejor no-combinable gana cuando supera la suma de combinables', () => {
      const result = resolveCombinability([
        { discount: combinableDiscount('c1', true), amount: 5, couponId: null },
        { discount: combinableDiscount('n1', false), amount: 20, couponId: null },
        { discount: combinableDiscount('n2', false), amount: 18, couponId: null },
      ]);
      expect(result).toEqual([
        { discountId: 'n1', couponId: null, amount: 20, combinable: false },
      ]);
    });

    it('empate sumCombinables=bestNonCombinable favorece a los combinables', () => {
      const result = resolveCombinability([
        { discount: combinableDiscount('c1', true), amount: 10, couponId: null },
        { discount: combinableDiscount('n1', false), amount: 10, couponId: null },
      ]);
      expect(result.map((item) => item.discountId)).toEqual(['c1']);
    });

    it('solo no-combinables devuelve el mejor; solo combinables devuelve todos', () => {
      expect(resolveCombinability([
        { discount: combinableDiscount('n1', false), amount: 5, couponId: null },
        { discount: combinableDiscount('n2', false), amount: 8, couponId: null },
      ])).toEqual([{ discountId: 'n2', couponId: null, amount: 8, combinable: false }]);
      const onlyCombinable = resolveCombinability([
        { discount: combinableDiscount('c1', true), amount: 3, couponId: null },
        { discount: combinableDiscount('c2', true), amount: 4, couponId: null },
      ]);
      expect(onlyCombinable.map((item) => item.discountId).sort()).toEqual(['c1', 'c2']);
    });

    it('cupón no-combinable que pierde frente a combinable mayor no se consume', async () => {
      const repo = new InMemoryPromotionRepository();
      const combinableCreated = await new CreateDiscountUseCase(repo).execute(discount({ name: 'combinable', type: 'fixed', value: 20, combinable: true, requiresCoupon: false }));
      const couponDiscountCreated = await new CreateDiscountUseCase(repo).execute(discount({ name: 'cupon', type: 'fixed', value: 5, combinable: false, requiresCoupon: true }));
      expect(combinableCreated.isOk() && couponDiscountCreated.isOk()).toBe(true);
      if (!couponDiscountCreated.isOk()) return;
      await new CreateCouponUseCase(repo).execute({ storeId: 'store-1', discountId: couponDiscountCreated.value.id, code: 'LOSER', active: true, globalUsageLimit: 10, perCustomerUsageLimit: null, startsAt: null, endsAt: null });

      const redeemed = await new RedeemCouponUseCase(repo).execute({ ...context(), couponCodes: ['LOSER'], idempotencyKey: 'loser-1' });

      expect(redeemed.isOk()).toBe(true);
      if (redeemed.isOk()) {
        expect(redeemed.value.discountTotal).toBe(20);
        expect(redeemed.value.appliedDiscounts.some((item) => item.couponId !== null)).toBe(false);
      }
      const coupon = await repo.findCouponByCode('store-1', 'LOSER');
      expect(coupon?.usageCount).toBe(0);
    });
  });

  it('cupón con globalUsageLimit=1: dos redenciones concurrentes y exactamente una gana', async () => {
    const repo = new InMemoryPromotionRepository();
    const created = await new CreateDiscountUseCase(repo).execute(discount({ requiresCoupon: true, value: 10 }));
    expect(created.isOk()).toBe(true);
    if (!created.isOk()) return;
    await new CreateCouponUseCase(repo).execute({ storeId: 'store-1', discountId: created.value.id, code: 'ONLYONE', active: true, globalUsageLimit: 1, perCustomerUsageLimit: null, startsAt: null, endsAt: null });
    const redeem = new RedeemCouponUseCase(repo);

    const [first, second] = await Promise.all([
      redeem.execute({ ...context({ customerId: 'customer-a' }), couponCodes: ['ONLYONE'], idempotencyKey: 'race-a' }),
      redeem.execute({ ...context({ customerId: 'customer-b' }), couponCodes: ['ONLYONE'], idempotencyKey: 'race-b' }),
    ]);

    const successes = [first, second].filter((r) => r.isOk());
    const failures = [first, second].filter((r) => r.isErr());
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    const coupon = await repo.findCouponByCode('store-1', 'ONLYONE');
    expect(coupon?.usageCount).toBe(1);
  });

  it('cupón con perCustomerUsageLimit=1: dos redenciones concurrentes del mismo cliente, una gana', async () => {
    const repo = new InMemoryPromotionRepository();
    const created = await new CreateDiscountUseCase(repo).execute(discount({ requiresCoupon: true, value: 10 }));
    expect(created.isOk()).toBe(true);
    if (!created.isOk()) return;
    await new CreateCouponUseCase(repo).execute({ storeId: 'store-1', discountId: created.value.id, code: 'PERCUS', active: true, globalUsageLimit: null, perCustomerUsageLimit: 1, startsAt: null, endsAt: null });
    const redeem = new RedeemCouponUseCase(repo);

    const [first, second] = await Promise.all([
      redeem.execute({ ...context({ customerId: 'cliente-x' }), couponCodes: ['PERCUS'], idempotencyKey: 'pc-1' }),
      redeem.execute({ ...context({ customerId: 'cliente-x' }), couponCodes: ['PERCUS'], idempotencyKey: 'pc-2' }),
    ]);

    expect([first, second].filter((r) => r.isOk())).toHaveLength(1);
    expect([first, second].filter((r) => r.isErr())).toHaveLength(1);
    const coupon = await repo.findCouponByCode('store-1', 'PERCUS');
    expect(coupon?.redemptionsByCustomer['cliente-x']).toBe(1);
  });

  it('accrue reward points: misma Idempotency-Key concurrente acredita una sola vez', async () => {
    const repo = new InMemoryPromotionRepository();
    await new ConfigureRewardProgramUseCase(repo).execute({ storeId: 'store-1', earnPointsPerCurrencyUnit: 1, redeemCurrencyPerPoint: 1, maxRedeemPercent: null, expiresAfterDays: null });
    const accrue = new AccrueRewardPointsUseCase(repo);

    const [first, second] = await Promise.all([
      accrue.execute({ storeId: 'store-1', customerId: 'customer-1', orderId: 'order-1', paidAmount: 50, idempotencyKey: 'race-points' }),
      accrue.execute({ storeId: 'store-1', customerId: 'customer-1', orderId: 'order-1', paidAmount: 50, idempotencyKey: 'race-points' }),
    ]);

    expect(first.isOk() && second.isOk()).toBe(true);
    if (first.isOk() && second.isOk()) expect(first.value).toEqual(second.value);
    const ledger = await repo.findRewardLedger('store-1', 'customer-1');
    expect(ledger).toHaveLength(1);
    expect(ledger[0]?.points).toBe(50);
  });
});

function combinableDiscount(id: string, combinable: boolean): DiscountProps {
  const now = new Date();
  return {
    id,
    storeId: 'store-1',
    name: id,
    type: 'fixed',
    value: 1,
    maxDiscountAmount: null,
    scope: 'order',
    targetIds: [],
    conditions: {},
    requiresCoupon: false,
    combinable,
    active: true,
    startsAt: null,
    endsAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function discount(overrides: Partial<Parameters<CreateDiscountUseCase['execute']>[0]> = {}): Parameters<CreateDiscountUseCase['execute']>[0] {
  return {
    storeId: 'store-1',
    name: 'descuento',
    type: 'percentage',
    value: 10,
    maxDiscountAmount: null,
    scope: 'order',
    targetIds: [],
    conditions: {},
    requiresCoupon: false,
    combinable: false,
    active: true,
    startsAt: null,
    endsAt: null,
    ...overrides,
  };
}

function context(overrides: Partial<Parameters<PreviewPromotionsUseCase['execute']>[0]> = {}): Parameters<PreviewPromotionsUseCase['execute']>[0] {
  return {
    storeId: 'store-1',
    customerId: 'customer-1',
    subtotal: 100,
    customerHasPreviousOrders: false,
    customerRole: 'retail',
    lines: [
      { productId: 'product-1', categoryIds: ['cat-a'], quantity: 1, unitPrice: 100 },
      { productId: 'product-2', categoryIds: ['cat-b'], quantity: 1, unitPrice: 50 },
    ],
    ...overrides,
  };
}
