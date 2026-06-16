import { describe, expect, it } from 'vitest';
import { OrderNotFoundError } from '../domain/errors';
import { CreateOrderUseCase } from './create-order.use-case';
import { AddOrderNoteUseCase } from './add-order-note.use-case';
import { makeContext, readyCart } from './orders.test-context';

function build() {
  const ctx = makeContext();
  const create = new CreateOrderUseCase(ctx.orders, ctx.orders, ctx.orders, ctx.orders, ctx.carts, ctx.stock, ctx.bus, ctx.email, ctx.taxResolver, ctx.shippingResolver);
  const addNote = new AddOrderNoteUseCase(ctx.orders, ctx.orders);
  return { ...ctx, create, addNote };
}

describe('AddOrderNoteUseCase', () => {
  it('agrega una nota a la orden', async () => {
    const ctx = build();
    ctx.stock.available.set('loc-1:v1', 1);
    ctx.carts.carts.set('cart-1', readyCart('cart-1'));
    const order = (await ctx.create.execute({ cartId: 'cart-1', idempotencyKey: 'k1' })).value;

    const result = await ctx.addNote.execute({ orderId: order.id, authorId: 'user-1', body: 'Llamar al cliente' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.notes.some((note) => note.body === 'Llamar al cliente')).toBe(true);
  });

  it('falla con OrderNotFoundError si la orden no existe', async () => {
    const ctx = build();

    const result = await ctx.addNote.execute({ orderId: 'missing', authorId: 'user-1', body: 'x' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(OrderNotFoundError);
  });
});
