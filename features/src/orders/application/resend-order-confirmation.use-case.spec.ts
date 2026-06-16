import { describe, expect, it } from 'vitest';
import { OrderNotFoundError } from '../domain/errors';
import { CreateOrderUseCase } from './create-order.use-case';
import { ResendOrderConfirmationUseCase } from './resend-order-confirmation.use-case';
import { makeContext, readyCart } from './orders.test-context';

function build() {
  const ctx = makeContext();
  const create = new CreateOrderUseCase(ctx.orders, ctx.orders, ctx.orders, ctx.orders, ctx.carts, ctx.stock, ctx.bus, ctx.email, ctx.taxResolver, ctx.shippingResolver);
  const resend = new ResendOrderConfirmationUseCase(ctx.orders, ctx.email);
  return { ...ctx, create, resend };
}

describe('ResendOrderConfirmationUseCase', () => {
  it('reencola el correo de confirmación de una orden existente', async () => {
    const ctx = build();
    ctx.stock.available.set('loc-1:v1', 1);
    ctx.carts.carts.set('cart-1', readyCart('cart-1'));
    const order = (await ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k1' })).value;
    const before = ctx.email.jobs.filter((job) => job === 'order.created').length;

    const result = await ctx.resend.execute(order.id);

    expect(result.isOk()).toBe(true);
    expect(ctx.email.jobs.filter((job) => job === 'order.created').length).toBe(before + 1);
  });

  it('falla con OrderNotFoundError si la orden no existe', async () => {
    const ctx = build();

    const result = await ctx.resend.execute('missing');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(OrderNotFoundError);
  });
});
