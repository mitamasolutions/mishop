import { describe, expect, it } from 'vitest';
import { PaymentNotFoundError } from '../domain/errors';
import { AuthorizePaymentUseCase } from './authorize-payment.use-case';
import { VoidPaymentUseCase } from './void-payment.use-case';
import { makeContext } from './payments.test-context';

function build() {
  const ctx = makeContext();
  // Captura manual: deja el pago en `authorized` para poder anularlo.
  void ctx.methods.save({
    id: 'default-test', storeId: 'default', providerCode: 'test', displayName: 'Test', enabled: true,
    credentials: { apiKey: 'sk_test' }, webhookSecret: 'per-tenant-secret', captureMode: 'manual',
  });
  const authorize = new AuthorizePaymentUseCase(ctx.payments, ctx.methods, ctx.registry, ctx.orders, ctx.eventBus);
  const voidPayment = new VoidPaymentUseCase(ctx.payments, ctx.payments, ctx.methods, ctx.registry, ctx.eventBus);
  return { ...ctx, authorize, voidPayment };
}

describe('VoidPaymentUseCase', () => {
  it('anula una autorización vigente y la deja en voided', async () => {
    const ctx = build();
    const authorized = await ctx.authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'test', amount: 100, currency: 'MXN' });
    expect(authorized.value.status).toBe('authorized');

    const result = await ctx.voidPayment.execute({ paymentId: authorized.value.id });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.status).toBe('voided');
  });

  it('falla con PaymentNotFoundError si el pago no existe', async () => {
    const ctx = build();

    const result = await ctx.voidPayment.execute({ paymentId: 'missing' });

    expect(result.isErr() && result.error).toBeInstanceOf(PaymentNotFoundError);
  });
});
