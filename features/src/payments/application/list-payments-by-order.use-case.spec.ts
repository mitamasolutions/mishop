import { describe, expect, it } from 'vitest';
import { AuthorizePaymentUseCase } from './authorize-payment.use-case';
import { ListPaymentsByOrderUseCase } from './list-payments-by-order.use-case';
import { makeContext } from './payments.test-context';

function build() {
  const ctx = makeContext();
  const authorize = new AuthorizePaymentUseCase(ctx.payments, ctx.methods, ctx.registry, ctx.orders, ctx.eventBus);
  const list = new ListPaymentsByOrderUseCase(ctx.payments);
  return { ...ctx, authorize, list };
}

describe('ListPaymentsByOrderUseCase', () => {
  it('lista los pagos de una orden', async () => {
    const ctx = build();
    const payment = await ctx.authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'test', amount: 100, currency: 'MXN' });

    const result = await ctx.list.execute('order-1');

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.map((entry) => entry.id)).toContain(payment.value.id);
  });

  it('devuelve lista vacía cuando la orden no tiene pagos', async () => {
    const ctx = build();

    const result = await ctx.list.execute('order-sin-pagos');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value).toHaveLength(0);
  });
});
