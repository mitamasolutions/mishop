import { describe, expect, it } from 'vitest';
import { InvalidWebhookSignatureError, TransientPaymentProviderError } from '../domain/errors';
import { AuthorizePaymentUseCase } from './authorize-payment.use-case';
import { HandlePaymentWebhookUseCase } from './handle-payment-webhook.use-case';
import { makeContext, sign } from './payments.test-context';

function build() {
  const ctx = makeContext();
  const authorize = new AuthorizePaymentUseCase(ctx.payments, ctx.methods, ctx.registry, ctx.orders, ctx.eventBus);
  const webhook = new HandlePaymentWebhookUseCase(ctx.payments, ctx.payments, ctx.payments, ctx.webhooks, ctx.methods, ctx.registry, ctx.eventBus);
  return { ...ctx, authorize, webhook };
}

describe('HandlePaymentWebhookUseCase', () => {
  it('procesa un webhook duplicado una sola vez', async () => {
    const ctx = build();
    const payment = await ctx.authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'test', amount: 100, currency: 'MXN' });
    const rawBody = JSON.stringify({ eventId: 'evt-1', paymentId: payment.value.id, status: 'paid' });
    const headers = { 'x-test-signature': sign(rawBody) };

    const first = await ctx.webhook.execute({ providerCode: 'test', headers, rawBody });
    const second = await ctx.webhook.execute({ providerCode: 'test', headers, rawBody });

    expect(first.isOk() && first.value.duplicate).toBe(false);
    expect(second.isOk() && second.value.duplicate).toBe(true);
  });

  it('NO colisiona el mismo eventId entre dos tiendas (unicidad por storeId)', async () => {
    const ctx = build();
    const paymentA = await ctx.authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'test', amount: 100, currency: 'MXN' });
    // Segunda tienda con el mismo provider y un pago propio.
    const ctxB = build();
    ctxB.orders.orders.set('order-b', { id: 'order-b', storeId: 'store-b', currencyCode: 'MXN', total: 50, paidAmount: 0, paymentStatus: 'pending', status: 'pending' });
    void ctxB.methods.save({
      id: 'store-b-test', storeId: 'store-b', providerCode: 'test', displayName: 'Test B', enabled: true,
      credentials: { apiKey: 'sk_test' }, webhookSecret: 'per-tenant-secret', captureMode: 'automatic',
    });
    const paymentB = await ctxB.authorize.execute({ storeId: 'store-b', orderId: 'order-b', providerCode: 'test', amount: 50, currency: 'MXN' });

    const rawBodyA = JSON.stringify({ eventId: 'evt-shared', paymentId: paymentA.value.id, status: 'paid' });
    const rawBodyB = JSON.stringify({ eventId: 'evt-shared', paymentId: paymentB.value.id, status: 'paid' });
    const a = await ctx.webhook.execute({ providerCode: 'test', headers: { 'x-test-signature': sign(rawBodyA) }, rawBody: rawBodyA });
    const b = await ctxB.webhook.execute({ providerCode: 'test', headers: { 'x-test-signature': sign(rawBodyB) }, rawBody: rawBodyB });

    expect(a.isOk() && a.value.duplicate).toBe(false);
    expect(b.isOk() && b.value.duplicate).toBe(false);
  });

  it('rechaza firma inválida sin mutar estado', async () => {
    const ctx = build();
    const payment = await ctx.authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'test', amount: 100, currency: 'MXN' });
    const rawBody = JSON.stringify({ eventId: 'evt-1', paymentId: payment.value.id, status: 'failed' });

    const result = await ctx.webhook.execute({ providerCode: 'test', headers: { 'x-test-signature': 'bad' }, rawBody });
    const stored = await ctx.payments.findById(payment.value.id);

    expect(result.isErr() && result.error).toBeInstanceOf(InvalidWebhookSignatureError);
    expect(stored?.status).toBe('paid');
  });

  it('devuelve error transitorio para forzar reintento', async () => {
    const ctx = build();
    const payment = await ctx.authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'test', amount: 100, currency: 'MXN' });
    const rawBody = JSON.stringify({ eventId: 'evt-1', paymentId: payment.value.id, status: 'paid', transientFailure: true });

    const result = await ctx.webhook.execute({ providerCode: 'test', headers: { 'x-test-signature': sign(rawBody) }, rawBody });

    expect(result.isErr() && result.error).toBeInstanceOf(TransientPaymentProviderError);
  });

  it('ignora eventos antiguos que intentarían revertir estado', async () => {
    const ctx = build();
    const payment = await ctx.authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'test', amount: 100, currency: 'MXN' });
    const rawBody = JSON.stringify({ eventId: 'evt-old', paymentId: payment.value.id, status: 'authorized', occurredAt: '2020-01-01T00:00:00.000Z' });

    const result = await ctx.webhook.execute({ providerCode: 'test', headers: { 'x-test-signature': sign(rawBody) }, rawBody });
    const stored = await ctx.payments.findById(payment.value.id);

    expect(result.isOk()).toBe(true);
    expect(stored?.status).toBe('paid');
  });
});
