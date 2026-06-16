import { describe, expect, it } from 'vitest';
import { PaymentNotFoundError } from '../domain/errors';
import { AuthorizePaymentUseCase } from './authorize-payment.use-case';
import { CapturePaymentUseCase } from './capture-payment.use-case';
import { makeContext } from './payments.test-context';

function build() {
  const ctx = makeContext();
  // Captura manual: la autorización deja el pago en `authorized` para luego capturar.
  void ctx.methods.save({
    id: 'default-test', storeId: 'default', providerCode: 'test', displayName: 'Test', enabled: true,
    credentials: { apiKey: 'sk_test' }, webhookSecret: 'per-tenant-secret', captureMode: 'manual',
  });
  const authorize = new AuthorizePaymentUseCase(ctx.payments, ctx.methods, ctx.registry, ctx.orders, ctx.eventBus);
  const capture = new CapturePaymentUseCase(ctx.payments, ctx.payments, ctx.methods, ctx.registry, ctx.eventBus);
  return { ...ctx, authorize, capture };
}

describe('CapturePaymentUseCase', () => {
  it('captura un pago autorizado y lo deja en paid', async () => {
    const ctx = build();
    const authorized = await ctx.authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'test', amount: 100, currency: 'MXN' });
    expect(authorized.value.status).toBe('authorized');

    const result = await ctx.capture.execute({ paymentId: authorized.value.id });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.status).toBe('paid');
  });

  it('falla con PaymentNotFoundError si el pago no existe', async () => {
    const ctx = build();

    const result = await ctx.capture.execute({ paymentId: 'missing' });

    expect(result.isErr() && result.error).toBeInstanceOf(PaymentNotFoundError);
  });
});
