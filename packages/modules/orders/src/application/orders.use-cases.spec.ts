import { describe, expect, it } from 'vitest';
import { InMemoryEventBus } from '@mitama/core';
import { InMemoryCheckoutCartReader } from '../infra/in-memory-checkout-cart.reader';
import { InMemoryOrderRepository } from '../infra/in-memory-order.repository';
import { InMemoryStockReservationService } from '../infra/in-memory-stock-reservation.service';
import type { EmailQueue } from '../domain/email-queue';
import { IdempotencyConflictError } from '../domain/errors';
import { CancelOrderUseCase, ChangePaymentStateUseCase, CreateOrderUseCase } from './order-use-cases';

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

  it('emite eventos y respeta máquinas de estado', async () => {
    const ctx = context();
    ctx.stock.available.set('loc-1:v1', 2);
    ctx.carts.carts.set('cart-1', readyCart('cart-1'));
    const order = (await ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k1' })).value;
    const paid = await ctx.payment.execute({ orderId: order.id, to: 'paid' });

    expect(paid.isErr()).toBe(true);
    await ctx.payment.execute({ orderId: order.id, to: 'authorized' });
    const captured = await ctx.payment.execute({ orderId: order.id, to: 'paid' });
    expect(captured.isOk()).toBe(true);
    expect(ctx.events).toContain('order.created');
    expect(ctx.events).toContain('payment.authorized');
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
  return {
    carts,
    stock,
    events,
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
