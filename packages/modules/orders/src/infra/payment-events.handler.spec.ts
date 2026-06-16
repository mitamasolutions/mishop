import { describe, expect, it } from 'vitest';
import { CreateOrderUseCase } from '../application/create-order.use-case';
import { makeContext, readyCart } from '../application/orders.test-context';
import { PaymentEventsHandler } from './payment-events.handler';

function build() {
  const ctx = makeContext();
  const create = new CreateOrderUseCase(ctx.orders, ctx.orders, ctx.orders, ctx.orders, ctx.carts, ctx.stock, ctx.bus, ctx.email, ctx.taxResolver, ctx.shippingResolver);
  return { ...ctx, create };
}

describe('PaymentEventsHandler', () => {
  it('no duplica correo cuando llega dos veces el mismo evento de pago', async () => {
    const ctx = build();
    ctx.stock.available.set('loc-1:v1', 2);
    ctx.carts.carts.set('cart-1', readyCart('cart-1'));
    const order = (await ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k1' })).value;
    new PaymentEventsHandler(ctx.bus, ctx.orders, ctx.orders, ctx.email, ctx.stock).onModuleInit();

    await ctx.bus.publish({ name: 'payment.paid', occurredAt: new Date(), payload: { orderId: order.id } });
    await ctx.bus.publish({ name: 'payment.paid', occurredAt: new Date(), payload: { orderId: order.id } });
    const stored = await ctx.orders.findById(order.id);

    expect(stored?.transitionPayment('paid', null, 'sin cambio')).toBe(false);
    expect(ctx.email.jobs.filter((job) => job === 'payment.paid')).toHaveLength(1);
  });

  it('consume el stock al pagar y libera al fallar el pago (regresión)', async () => {
    const ctx = build();
    ctx.stock.available.set('loc-1:v1', 2);
    ctx.carts.carts.set('cart-a', readyCart('cart-a'));
    ctx.carts.carts.set('cart-b', readyCart('cart-b'));
    new PaymentEventsHandler(ctx.bus, ctx.orders, ctx.orders, ctx.email, ctx.stock).onModuleInit();

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
});
