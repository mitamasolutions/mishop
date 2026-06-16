import { describe, expect, it } from 'vitest';
import { OrderNotFoundError } from '../domain/errors';
import { CreateOrderUseCase } from './create-order.use-case';
import { CancelOrderUseCase } from './cancel-order.use-case';
import { makeContext, readyCart } from './orders.test-context';

function build() {
  const ctx = makeContext();
  const create = new CreateOrderUseCase(ctx.orders, ctx.orders, ctx.orders, ctx.orders, ctx.carts, ctx.stock, ctx.bus, ctx.email, ctx.taxResolver, ctx.shippingResolver);
  const cancel = new CancelOrderUseCase(ctx.orders, ctx.orders, ctx.stock, ctx.bus, ctx.email);
  return { ...ctx, create, cancel };
}

describe('CancelOrderUseCase', () => {
  it('cancelar libera la reserva de stock', async () => {
    const ctx = build();
    ctx.stock.available.set('loc-1:v1', 1);
    ctx.carts.carts.set('cart-1', readyCart('cart-1'));

    const order = (await ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k1' })).value;
    expect(ctx.stock.available.get('loc-1:v1')).toBe(0);

    const result = await ctx.cancel.execute({ orderId: order.id, reason: 'test' });

    expect(result.isOk()).toBe(true);
    expect(ctx.stock.available.get('loc-1:v1')).toBe(1);
    expect(ctx.email.jobs).toContain('order.cancelled');
  });

  it('falla con OrderNotFoundError si la orden no existe', async () => {
    const ctx = build();

    const result = await ctx.cancel.execute({ orderId: 'missing', reason: 'test' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(OrderNotFoundError);
  });
});
