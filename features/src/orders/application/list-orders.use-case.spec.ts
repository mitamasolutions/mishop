import { describe, expect, it } from 'vitest';
import { CreateOrderUseCase } from './create-order.use-case';
import { ListOrdersUseCase } from './list-orders.use-case';
import { makeContext, readyCart } from './orders.test-context';

function build() {
  const ctx = makeContext();
  const create = new CreateOrderUseCase(ctx.orders, ctx.orders, ctx.orders, ctx.orders, ctx.carts, ctx.stock, ctx.bus, ctx.email, ctx.taxResolver, ctx.shippingResolver);
  const list = new ListOrdersUseCase(ctx.orders);
  return { ...ctx, create, list };
}

describe('ListOrdersUseCase', () => {
  it('devuelve la orden creada en la página', async () => {
    const ctx = build();
    ctx.stock.available.set('loc-1:v1', 1);
    ctx.carts.carts.set('cart-1', readyCart('cart-1'));
    const order = (await ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k1' })).value;

    const result = await ctx.list.execute({ storeId: 'store-1', page: 1, pageSize: 10 });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.total).toBe(1);
    expect(result.value.items.map((item) => item.id)).toContain(order.id);
  });

  it('devuelve página vacía cuando no hay órdenes', async () => {
    const ctx = build();

    const result = await ctx.list.execute({ storeId: 'store-1', page: 1, pageSize: 10 });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.total).toBe(0);
    expect(result.value.items).toHaveLength(0);
  });
});
