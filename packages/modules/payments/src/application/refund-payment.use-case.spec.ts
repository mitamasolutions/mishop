import { describe, expect, it } from 'vitest';
import { PaymentNotRefundableError, RefundAmountExceededError } from '../domain/errors';
import { AuthorizePaymentUseCase } from './authorize-payment.use-case';
import { RefundPaymentUseCase } from './refund-payment.use-case';
import { makeContext } from './payments.test-context';

function build() {
  const ctx = makeContext();
  const authorize = new AuthorizePaymentUseCase(ctx.payments, ctx.methods, ctx.registry, ctx.orders, ctx.eventBus);
  const refund = new RefundPaymentUseCase(ctx.payments, ctx.payments, ctx.methods, ctx.registry, ctx.eventBus);
  return { ...ctx, authorize, refund };
}

describe('RefundPaymentUseCase', () => {
  it('rechaza reembolsos que exceden el saldo cobrable', async () => {
    const ctx = build();
    const payment = await ctx.authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'test', amount: 100, currency: 'MXN' });

    const result = await ctx.refund.execute({ paymentId: payment.value.id, amount: 101 });

    expect(result.isErr() && result.error).toBeInstanceOf(RefundAmountExceededError);
  });

  it('rechaza reembolso sobre un pago pendiente (no cobrado)', async () => {
    const ctx = build();
    const payment = await ctx.authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'manual', amount: 100, currency: 'MXN' });

    const result = await ctx.refund.execute({ paymentId: payment.value.id, amount: 10 });

    expect(result.isErr() && result.error).toBeInstanceOf(PaymentNotRefundableError);
  });
});
