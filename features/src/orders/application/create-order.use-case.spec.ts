import { describe, expect, it } from 'vitest';
import { IdempotencyConflictError, OrderAlreadyExistsForCartError, ShippingMethodNotEligibleError } from '../domain/errors';
import { CreateOrderUseCase } from './create-order.use-case';
import { makeContext, readyCart } from './orders.test-context';

function build() {
  const ctx = makeContext();
  const create = new CreateOrderUseCase(
    ctx.orders,
    ctx.orders,
    ctx.orders,
    ctx.orders,
    ctx.carts,
    ctx.stock,
    ctx.bus,
    ctx.email,
    ctx.taxResolver,
    ctx.shippingResolver,
  );
  return { ...ctx, create };
}

describe('CreateOrderUseCase', () => {
  it('crea orden idempotente y rechaza mismo key con payload distinto', async () => {
    const ctx = build();
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
    const ctx = build();
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
    const ctx = build();
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

  it('solo una orden gana el último ítem de stock', async () => {
    const ctx = build();
    ctx.stock.available.set('loc-1:v1', 1);
    ctx.carts.carts.set('cart-1', readyCart('cart-1'));
    ctx.carts.carts.set('cart-2', readyCart('cart-2'));

    const [first, second] = await Promise.all([
      ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k1' }),
      ctx.create.execute({ cartId: 'cart-2', idempotencyKey: 'k2' }),
    ]);

    expect([first.isOk(), second.isOk()].filter(Boolean)).toHaveLength(1);
  });

  // --- F2 · r13 — totales server-side (sprint1_cierre) ---------------------

  it('ignora los totales del carrito y usa los del resolver server-side', async () => {
    const ctx = build();
    ctx.stock.available.set('loc-1:v1', 2);
    // El cliente envía un cart con shippingMethod.amount=999 y unitPrice
    // legítimo de 10. El resolver fija envío en 5 y el impuesto en 16 %.
    ctx.carts.carts.set('cart-1', readyCart('cart-1'));

    const result = await ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k1' });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    expect(result.value.subtotal).toBe(10);
    expect(result.value.shippingTotal).toBe(5); // ← resolver, NO 999
    expect(result.value.taxTotal).toBe(1.6); // 10 * 0.16
    expect(result.value.total).toBe(16.6);
    expect(result.value.lines[0].taxAmount).toBe(1.6);
    expect(result.value.shippingMethod).toMatchObject({ id: 'flat', amount: 5, providerCode: 'default' });
  });

  it('calcula taxTotal correcto con líneas standard, zero y exempt', async () => {
    const ctx = build();
    ctx.stock.available.set('loc-1:vA', 5);
    ctx.stock.available.set('loc-1:vB', 5);
    ctx.stock.available.set('loc-1:vC', 5);

    const cart = readyCart('cart-1');
    cart.lines = [
      { ...cart.lines[0], cartLineId: 'l-std', variantId: 'vA', taxCategory: 'standard' as const, unitPrice: 100, quantity: 1 },
      { ...cart.lines[0], cartLineId: 'l-zero', variantId: 'vB', taxCategory: 'zero' as const, unitPrice: 50, quantity: 2 },
      { ...cart.lines[0], cartLineId: 'l-exempt', variantId: 'vC', taxCategory: 'exempt' as const, unitPrice: 25, quantity: 4 },
    ];
    ctx.carts.carts.set('cart-1', cart);

    const result = await ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k1' });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    // Solo la línea standard tributa: 100 * 0.16 = 16
    expect(result.value.taxTotal).toBe(16);
    expect(result.value.subtotal).toBe(300); // 100 + 100 + 100
    expect(result.value.shippingTotal).toBe(5);
    expect(result.value.total).toBe(321); // 300 + 5 + 16

    // Cada línea persiste su taxAmount real (snapshot inmutable).
    const taxAmounts = result.value.lines.map((line) => line.taxAmount).sort((a, b) => a - b);
    expect(taxAmounts).toEqual([0, 0, 16]);
  });

  it('rechaza el checkout si el método de envío deja de ser elegible', async () => {
    const ctx = build();
    ctx.stock.available.set('loc-1:v1', 1);
    ctx.carts.carts.set('cart-1', readyCart('cart-1'));
    ctx.shippingResolver.eligible = false;

    const result = await ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k1' });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(ShippingMethodNotEligibleError);
    // Sin orden creada: el stock no se debe haber consumido.
    expect(ctx.stock.available.get('loc-1:v1')).toBe(1);
  });

  it('el envío NO se grava: total = subtotal + shipping + tax (productos)', async () => {
    const ctx = build();
    ctx.stock.available.set('loc-1:v1', 1);
    ctx.carts.carts.set('cart-1', readyCart('cart-1'));
    ctx.shippingResolver.amount = 100;

    const result = await ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k1' });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    // tax = 10 * 0.16 = 1.6 (NO sobre el envío); total = 10 + 100 + 1.6 = 111.6
    expect(result.value.taxTotal).toBe(1.6);
    expect(result.value.total).toBe(111.6);
  });
});
