import { describe, expect, it } from 'vitest';
import { PaymentNotFoundError } from '../domain/errors';
import { AuthorizePaymentUseCase } from './authorize-payment.use-case';
import { MarkManualPaymentPaidUseCase } from './mark-manual-payment-paid.use-case';
import { makeContext } from './payments.test-context';

function build() {
  const ctx = makeContext();
  const authorize = new AuthorizePaymentUseCase(ctx.payments, ctx.methods, ctx.registry, ctx.orders, ctx.eventBus);
  const markPaid = new MarkManualPaymentPaidUseCase(ctx.payments, ctx.payments, ctx.eventBus);
  return { ...ctx, authorize, markPaid };
}

describe('MarkManualPaymentPaidUseCase', () => {
  it('marca como pagado un pago manual pendiente', async () => {
    const ctx = build();
    // El provider manual deja la autorización en `pending`.
    const pending = await ctx.authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'manual', amount: 100, currency: 'MXN' });
    expect(pending.value.status).toBe('pending');

    const result = await ctx.markPaid.execute({ paymentId: pending.value.id, actorId: 'admin-1' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.status).toBe('paid');
  });

  it('falla con PaymentNotFoundError si el pago no existe', async () => {
    const ctx = build();

    const result = await ctx.markPaid.execute({ paymentId: 'missing', actorId: 'admin-1' });

    expect(result.isErr() && result.error).toBeInstanceOf(PaymentNotFoundError);
  });
});
