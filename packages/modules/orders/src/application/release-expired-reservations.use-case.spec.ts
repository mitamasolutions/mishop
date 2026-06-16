import { describe, expect, it } from 'vitest';
import { CreateOrderUseCase } from './create-order.use-case';
import { ReleaseExpiredReservationsUseCase } from './release-expired-reservations.use-case';
import { makeContext, readyCart } from './orders.test-context';

function build() {
  const ctx = makeContext();
  const create = new CreateOrderUseCase(ctx.orders, ctx.orders, ctx.orders, ctx.orders, ctx.carts, ctx.stock, ctx.bus, ctx.email, ctx.taxResolver, ctx.shippingResolver);
  const release = new ReleaseExpiredReservationsUseCase(ctx.stock);
  return { ...ctx, create, release };
}

describe('ReleaseExpiredReservationsUseCase', () => {
  it('libera las reservas expiradas y repone el stock', async () => {
    const ctx = build();
    ctx.stock.available.set('loc-1:v1', 1);
    ctx.carts.carts.set('cart-1', readyCart('cart-1'));

    const order = (await ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k1' })).value;
    expect(ctx.stock.available.get('loc-1:v1')).toBe(0);

    // Avanzamos el horizonte de corte 30 min al futuro para vencer la reserva.
    const future = new Date(Date.now() + 30 * 60 * 1000);
    const result = await ctx.release.execute(future);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value).toContain(order.id);
    expect(ctx.stock.available.get('loc-1:v1')).toBe(1);
  });
});
