import { describe, expect, it } from 'vitest';
import { CreateOrderUseCase } from './create-order.use-case';
import { ChangePaymentStateUseCase } from './change-payment-state.use-case';
import { makeContext, readyCart } from './orders.test-context';

function build() {
  const ctx = makeContext();
  const create = new CreateOrderUseCase(ctx.orders, ctx.orders, ctx.orders, ctx.orders, ctx.carts, ctx.stock, ctx.bus, ctx.email, ctx.taxResolver, ctx.shippingResolver);
  const payment = new ChangePaymentStateUseCase(ctx.orders, ctx.orders, ctx.bus, ctx.email);
  return { ...ctx, create, payment };
}

describe('ChangePaymentStateUseCase', () => {
  it('emite eventos y respeta máquinas de estado', async () => {
    const ctx = build();
    ctx.stock.available.set('loc-1:v1', 2);
    ctx.carts.carts.set('cart-1', readyCart('cart-1'));
    const order = (await ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k1' })).value;
    await ctx.drainOutbox();

    const paid = await ctx.payment.execute({ orderId: order.id, to: 'paid' });
    // payment.paid también viaja por outbox tras F4 (r24 · sprint1_cierre);
    // drenamos para que el event bus lo entregue al spy de eventos.
    await ctx.drainOutbox();

    expect(paid.isOk()).toBe(true);
    // Una transición inválida hacia atrás es rechazada por la máquina de estados.
    const staleAuthorization = await ctx.payment.execute({ orderId: order.id, to: 'authorized' });
    expect(staleAuthorization.isErr()).toBe(true);
    expect(ctx.events).toContain('order.created');
    expect(ctx.events).toContain('payment.paid');
  });

  it('encola el correo de pago al transicionar a paid', async () => {
    const ctx = build();
    ctx.stock.available.set('loc-1:v1', 1);
    ctx.carts.carts.set('cart-1', readyCart('cart-1'));
    const order = (await ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k1' })).value;

    await ctx.payment.execute({ orderId: order.id, to: 'paid' });

    expect(ctx.email.jobs).toContain('payment.paid');
  });
});
