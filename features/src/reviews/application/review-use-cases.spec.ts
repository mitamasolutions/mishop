import { describe, expect, it } from 'vitest';
import { InMemoryEventBus } from '@mitama/core';
import { OrderEventsHandler } from '../infra/order-events.handler';
import { InMemoryReviewRepository, InMemoryVerifiedPurchaseRepository } from '../infra/in-memory-review.repository';
import { CreateReviewUseCase, GetProductRatingUseCase, ModerateReviewUseCase } from './review-use-cases';

describe('review use cases', () => {
  it('exige compra verificada y evita segunda review', async () => {
    const repo = new InMemoryReviewRepository();
    const purchases = new InMemoryVerifiedPurchaseRepository();
    const createReview = new CreateReviewUseCase(repo, purchases);

    const rejected = await createReview.execute(input());
    await purchases.record([{ storeId: 'store-1', customerId: 'customer-1', productId: 'product-1', orderId: 'order-seed' }]);
    const created = await createReview.execute(input());
    const duplicate = await createReview.execute(input());

    expect(rejected.isErr()).toBe(true);
    expect(created.isOk()).toBe(true);
    expect(duplicate.isErr()).toBe(true);
  });

  it('solo reviews aprobadas afectan rating agregado', async () => {
    const repo = new InMemoryReviewRepository();
    const purchases = new InMemoryVerifiedPurchaseRepository();
    await purchases.record([{ storeId: 'store-1', customerId: 'customer-1', productId: 'product-1', orderId: 'order-seed' }]);
    const created = await new CreateReviewUseCase(repo, purchases).execute(input({ rating: 5 }));
    expect(created.isOk()).toBe(true);
    if (!created.isOk()) return;
    const before = await new GetProductRatingUseCase(repo).execute({ storeId: 'store-1', productId: 'product-1' });
    await new ModerateReviewUseCase(repo).execute({ storeId: 'store-1', id: created.value.id, status: 'approved', moderatorId: 'moderator-1' });
    const after = await new GetProductRatingUseCase(repo).execute({ storeId: 'store-1', productId: 'product-1' });

    expect(before.isOk() && after.isOk()).toBe(true);
    if (before.isOk() && after.isOk()) {
      expect(before.value.reviewCount).toBe(0);
      expect(after.value.averageRating).toBe(5);
      expect(after.value.reviewCount).toBe(1);
    }
  });

  describe('proyección de compras verificadas vía eventos', () => {
    it('order.completed habilita CreateReview; order.refunded la revoca', async () => {
      const { handler, purchases, bus } = handlerCtx();
      handler.onModuleInit();
      const repo = new InMemoryReviewRepository();
      const createReview = new CreateReviewUseCase(repo, purchases);

      await bus.publish(orderEvent('order.completed', { orderId: 'order-1', productIds: ['product-1'] }));
      const created = await createReview.execute(input({ customerId: 'customer-2', productId: 'product-1' }));
      expect(created.isOk()).toBe(true);

      await bus.publish(orderEvent('order.refunded', { orderId: 'order-1', productIds: ['product-1'] }));
      const secondCustomer = await createReview.execute(input({ customerId: 'customer-3', productId: 'product-1' }));
      expect(secondCustomer.isErr()).toBe(true);
    });

    it('otra orden válida del mismo producto mantiene la verificación', async () => {
      const { handler, purchases, bus } = handlerCtx();
      handler.onModuleInit();
      const repo = new InMemoryReviewRepository();
      const createReview = new CreateReviewUseCase(repo, purchases);

      await bus.publish(orderEvent('order.completed', { orderId: 'order-A', productIds: ['product-1'] }));
      await bus.publish(orderEvent('order.completed', { orderId: 'order-B', productIds: ['product-1'] }));
      await bus.publish(orderEvent('order.refunded', { orderId: 'order-A', productIds: ['product-1'] }));

      const created = await createReview.execute(input({ customerId: 'customer-2', productId: 'product-1' }));
      expect(created.isOk()).toBe(true);
    });

    it('order.cancelled revoca y un cliente sin otra orden pierde la verificación', async () => {
      const { handler, purchases, bus } = handlerCtx();
      handler.onModuleInit();
      const repo = new InMemoryReviewRepository();
      const createReview = new CreateReviewUseCase(repo, purchases);

      await bus.publish(orderEvent('order.completed', { orderId: 'order-1', productIds: ['product-1', 'product-2'] }));
      await bus.publish(orderEvent('order.cancelled', { orderId: 'order-1', productIds: ['product-1', 'product-2'] }));

      const result = await createReview.execute(input({ customerId: 'customer-2', productId: 'product-1' }));
      expect(result.isErr()).toBe(true);
    });
  });
});

function input(overrides: Partial<Parameters<CreateReviewUseCase['execute']>[0]> = {}): Parameters<CreateReviewUseCase['execute']>[0] {
  return { storeId: 'store-1', productId: 'product-1', customerId: 'customer-1', rating: 4, title: 'Bueno', body: 'Me gustó', ...overrides };
}

function handlerCtx() {
  const bus = new InMemoryEventBus();
  const purchases = new InMemoryVerifiedPurchaseRepository();
  const handler = new OrderEventsHandler(bus, purchases);
  return { bus, purchases, handler };
}

function orderEvent(name: 'order.completed' | 'order.refunded' | 'order.cancelled', extra: { orderId: string; productIds: string[] }) {
  return {
    name,
    occurredAt: new Date(),
    payload: {
      orderId: extra.orderId,
      orderNumber: `WEB-${extra.orderId}`,
      storeId: 'store-1',
      customerId: 'customer-2',
      productIds: extra.productIds,
    },
  };
}
