import { describe, expect, it } from 'vitest';
import { InMemoryEventBus } from '@mitama/core';
import { InMemoryCheckoutCartReader } from '../infra/in-memory-checkout-cart.reader';
import { InMemoryOrderRepository } from '../infra/in-memory-order.repository';
import { InMemoryStockReservationService } from '../infra/in-memory-stock-reservation.service';
import { PaymentEventsHandler } from '../infra/payment-events.handler';
import type { EmailQueue } from '../domain/email-queue';
import { IdempotencyConflictError, OrderAlreadyExistsForCartError } from '../domain/errors';
import { CancelOrderUseCase, ChangePaymentStateUseCase, CreateOrderUseCase, ReleaseExpiredReservationsUseCase } from './order-use-cases';

class MemoryEmailQueue implements EmailQueue {
  readonly jobs: string[] = [];
  async enqueue(input: { templateCode: string }): Promise<void> {
    this.jobs.push(input.templateCode);
  }
}

describe('orders use cases', () => {
  it('crea orden idempotente y rechaza mismo key con payload distinto', async () => {
    const ctx = context();
    ctx.stock.available.set('loc-1:v1', 2);
    ctx.carts.carts.set('cart-1', readyCart('cart-1'));
    ctx.carts.carts.set('cart-2', readyCart('cart-2'));

    const first = await ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k1' });
    const replay = await ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k1' });
    const conflict = await ctx.create.execute({ cartId: 'cart-2', idempotencyKey: 'k1' });

    expect(first.isOk()).toBe(true);
    expect(replay.isOk()).toBe(true);
    if (first.isOk() && replay.isOk()) expect(replay.value.id).toBe(first.value.id);
    // Mismo key + payload distinto (otro cartId) = conflicto explícito, sin orden.
    expect(conflict.isErr()).toBe(true);
    if (conflict.isErr()) expect(conflict.error).toBeInstanceOf(IdempotencyConflictError);
  });

  it('replay tras carrito ya ordenado devuelve la orden original sin re-reservar stock (regresión)', async () => {
    const ctx = context();
    ctx.stock.available.set('loc-1:v1', 2);
    ctx.carts.carts.set('cart-1', readyCart('cart-1'));

    const first = await ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k1' });
    // El primer POST marca el carrito como ordenado: ya NO está "listo".
    await ctx.carts.markOrdered('cart-1');
    expect(await ctx.carts.getReadyCart('cart-1')).toBeNull();

    const replay = await ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k1' });

    expect(first.isOk()).toBe(true);
    expect(replay.isOk()).toBe(true);
    if (first.isOk() && replay.isOk()) expect(replay.value.id).toBe(first.value.id);
    // Una sola reserva: el ítem de stock no se descuenta dos veces (2 - 1 = 1).
    expect(ctx.stock.available.get('loc-1:v1')).toBe(1);
  });

  it('no permite dos órdenes para el mismo carrito con distinta Idempotency-Key', async () => {
    const ctx = context();
    ctx.stock.available.set('loc-1:v1', 2);
    ctx.carts.carts.set('cart-1', readyCart('cart-1'));

    const first = await ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k1' });
    // Simula una carrera: otra request ve el carrito todavía listo, pero la
    // unicidad por storeId+cartId debe bloquear la segunda orden.
    ctx.carts.ordered.delete('cart-1');
    const second = await ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k2' });

    expect(first.isOk()).toBe(true);
    if (first.isOk()) expect(first.value.cartId).toBe('cart-1');
    expect(second.isErr()).toBe(true);
    if (second.isErr()) expect(second.error).toBeInstanceOf(OrderAlreadyExistsForCartError);
    expect(ctx.stock.available.get('loc-1:v1')).toBe(1);
  });

  it('emite eventos y respeta máquinas de estado', async () => {
    const ctx = context();
    ctx.stock.available.set('loc-1:v1', 2);
    ctx.carts.carts.set('cart-1', readyCart('cart-1'));
    const order = (await ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k1' })).value;
    await ctx.drainOutbox();
    const paid = await ctx.payment.execute({ orderId: order.id, to: 'paid' });

    expect(paid.isOk()).toBe(true);
    const staleAuthorization = await ctx.payment.execute({ orderId: order.id, to: 'authorized' });
    expect(staleAuthorization.isErr()).toBe(true);
    expect(ctx.events).toContain('order.created');
    expect(ctx.events).toContain('payment.paid');
  });

  it('solo una orden gana el último ítem de stock y cancelar libera reserva', async () => {
    const ctx = context();
    ctx.stock.available.set('loc-1:v1', 1);
    ctx.carts.carts.set('cart-1', readyCart('cart-1'));
    ctx.carts.carts.set('cart-2', readyCart('cart-2'));

    const [first, second] = await Promise.all([
      ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k1' }),
      ctx.create.execute({ cartId: 'cart-2', idempotencyKey: 'k2' }),
    ]);

    expect([first.isOk(), second.isOk()].filter(Boolean)).toHaveLength(1);
    const winner = first.isOk() ? first.value : second.isOk() ? second.value : null;
    expect(winner).not.toBeNull();
    if (winner) await ctx.cancel.execute({ orderId: winner.id, reason: 'test' });
    expect(ctx.stock.available.get('loc-1:v1')).toBe(1);
  });

  it('no duplica correo cuando llega dos veces el mismo evento de pago', async () => {
    const ctx = context();
    ctx.stock.available.set('loc-1:v1', 2);
    ctx.carts.carts.set('cart-1', readyCart('cart-1'));
    const order = (await ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k1' })).value;
    new PaymentEventsHandler(ctx.bus, ctx.orders, ctx.email, ctx.stock).onModuleInit();

    await ctx.bus.publish({ name: 'payment.paid', occurredAt: new Date(), payload: { orderId: order.id } });
    await ctx.bus.publish({ name: 'payment.paid', occurredAt: new Date(), payload: { orderId: order.id } });
    const stored = await ctx.orders.findById(order.id);

    expect(stored?.transitionPayment('paid', null, 'sin cambio')).toBe(false);
    expect(ctx.email.jobs.filter((job) => job === 'payment.paid')).toHaveLength(1);
  });

  it('consume el stock al pagar y libera al fallar el pago (regresión)', async () => {
    const ctx = context();
    ctx.stock.available.set('loc-1:v1', 2);
    ctx.carts.carts.set('cart-a', readyCart('cart-a'));
    ctx.carts.carts.set('cart-b', readyCart('cart-b'));
    new PaymentEventsHandler(ctx.bus, ctx.orders, ctx.email, ctx.stock).onModuleInit();

    const paidOrder = (await ctx.create.execute({ cartId: 'cart-a', idempotencyKey: 'ka' })).value;
    const failedOrder = (await ctx.create.execute({ cartId: 'cart-b', idempotencyKey: 'kb' })).value;
    // Tras reservar quedan 0 disponibles y 0 consumidos.
    expect(ctx.stock.available.get('loc-1:v1')).toBe(0);

    await ctx.bus.publish({ name: 'payment.paid', occurredAt: new Date(), payload: { orderId: paidOrder.id } });
    // Pago confirmado: una unidad consumida, disponible sigue en 0.
    expect(ctx.stock.consumed.get('loc-1:v1')).toBe(1);
    expect(ctx.stock.available.get('loc-1:v1')).toBe(0);

    await ctx.bus.publish({ name: 'payment.failed', occurredAt: new Date(), payload: { orderId: failedOrder.id } });
    // Pago fallido: stock liberado, vuelve a haber 1 disponible.
    expect(ctx.stock.available.get('loc-1:v1')).toBe(1);
  });

  it('libera reservas expiradas vía ReleaseExpiredReservationsUseCase', async () => {
    const ctx = context();
    ctx.stock.available.set('loc-1:v1', 1);
    ctx.carts.carts.set('cart-1', readyCart('cart-1'));

    const order = (await ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k1' })).value;
    expect(ctx.stock.available.get('loc-1:v1')).toBe(0);

    const release = new ReleaseExpiredReservationsUseCase(ctx.stock);
    const future = new Date(Date.now() + 30 * 60 * 1000);
    const result = await release.execute(future);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value).toContain(order.id);
    expect(ctx.stock.available.get('loc-1:v1')).toBe(1);
  });
});

function context() {
  const orders = new InMemoryOrderRepository();
  const carts = new InMemoryCheckoutCartReader();
  const stock = new InMemoryStockReservationService();
  const bus = new InMemoryEventBus();
  const email = new MemoryEmailQueue();
  const events: string[] = [];
  bus.subscribe('order.created', (event) => events.push(event.name));
  bus.subscribe('payment.authorized', (event) => events.push(event.name));
  bus.subscribe('payment.paid', (event) => events.push(event.name));
  bus.subscribe('order.cancelled', (event) => events.push(event.name));
  async function drainOutbox(): Promise<void> {
    while (orders.outbox.length > 0) {
      const event = orders.outbox.shift();
      if (!event) break;
      await bus.publish({ name: event.name, occurredAt: new Date(), payload: event.payload });
    }
  }
  return {
    carts,
    stock,
    bus,
    email,
    orders,
    events,
    drainOutbox,
    create: new CreateOrderUseCase(orders, carts, stock, bus, email),
    payment: new ChangePaymentStateUseCase(orders, bus, email),
    cancel: new CancelOrderUseCase(orders, stock, bus, email),
  };
}

function readyCart(id: string) {
  return {
    id,
    storeId: 'store-1',
    channel: 'web' as const,
    customerId: `customer-${id}`,
    email: `${id}@example.com`,
    shippingAddress: { line1: 'Uno' },
    billingAddress: { line1: 'Uno' },
    shippingMethod: { id: 'flat', name: 'Fijo', amount: 5 },
    paymentMethod: { provider: 'manual', method: 'offline' },
    lines: [
      {
        cartLineId: `line-${id}`,
        variantId: 'v1',
        productId: 'p1',
        productTitle: 'Producto',
        variantTitle: 'Default',
        sku: 'SKU',
        quantity: 1,
        currencyCode: 'MXN',
        unitPrice: 10,
        stockLocationId: 'loc-1',
      },
    ],
  };
}
