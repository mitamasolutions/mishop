import { describe, expect, it } from 'vitest';
import { InvalidOrderStateTransitionError, OrderNotFoundError } from '../domain/errors';
import { CreateOrderUseCase } from './create-order.use-case';
import { ChangeOrderStateUseCase } from './change-order-state.use-case';
import { makeContext, readyCart } from './orders.test-context';

function build() {
  const ctx = makeContext();
  const create = new CreateOrderUseCase(ctx.orders, ctx.orders, ctx.orders, ctx.orders, ctx.carts, ctx.stock, ctx.bus, ctx.email, ctx.taxResolver, ctx.shippingResolver);
  const change = new ChangeOrderStateUseCase(ctx.orders, ctx.orders, ctx.bus);
  return { ...ctx, create, change };
}

async function createOrder(ctx: ReturnType<typeof build>) {
  ctx.stock.available.set('loc-1:v1', 1);
  ctx.carts.carts.set('cart-1', readyCart('cart-1'));
  return (await ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k1' })).value;
}

describe('ChangeOrderStateUseCase', () => {
  it('avanza una orden de pending a confirmed', async () => {
    const ctx = build();
    const order = await createOrder(ctx);

    const result = await ctx.change.execute({ orderId: order.id, to: 'confirmed' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.status).toBe('confirmed');
  });

  it('rechaza una transición inválida (pending → completed)', async () => {
    const ctx = build();
    const order = await createOrder(ctx);

    const result = await ctx.change.execute({ orderId: order.id, to: 'completed' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(InvalidOrderStateTransitionError);
  });

  it('falla con OrderNotFoundError si la orden no existe', async () => {
    const ctx = build();

    const result = await ctx.change.execute({ orderId: 'missing', to: 'confirmed' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(OrderNotFoundError);
  });
});
