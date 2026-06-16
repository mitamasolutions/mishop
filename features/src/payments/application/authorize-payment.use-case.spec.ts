import { describe, expect, it } from 'vitest';
import {
  OrderForPaymentNotFoundError,
  OrderNotPayableError,
  PaymentAmountExceedsOrderError,
  PaymentCurrencyMismatchError,
  PaymentMethodUnavailableError,
  PaymentStoreMismatchError,
} from '../domain/errors';
import { AuthorizePaymentUseCase } from './authorize-payment.use-case';
import { makeContext } from './payments.test-context';

function build() {
  const ctx = makeContext();
  const authorize = new AuthorizePaymentUseCase(ctx.payments, ctx.methods, ctx.registry, ctx.orders, ctx.eventBus);
  return { ...ctx, authorize };
}

describe('AuthorizePaymentUseCase', () => {
  it('autoriza y cobra (captura automática) una orden pagable', async () => {
    const ctx = build();

    const result = await ctx.authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'test', amount: 100, currency: 'MXN' });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.status).toBe('paid');
    const stored = await ctx.payments.findById(result.value.id);
    expect(stored?.status).toBe('paid');
  });

  it('rechaza autorización para una orden inexistente, distinta tienda o moneda', async () => {
    const ctx = build();

    const notFound = await ctx.authorize.execute({ storeId: 'default', orderId: 'missing', providerCode: 'test', amount: 100, currency: 'MXN' });
    const wrongStore = await ctx.authorize.execute({ storeId: 'other', orderId: 'order-1', providerCode: 'test', amount: 100, currency: 'MXN' });
    const wrongCurrency = await ctx.authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'test', amount: 100, currency: 'USD' });

    expect(notFound.isErr() && notFound.error).toBeInstanceOf(OrderForPaymentNotFoundError);
    expect(wrongStore.isErr() && wrongStore.error).toBeInstanceOf(PaymentStoreMismatchError);
    expect(wrongCurrency.isErr() && wrongCurrency.error).toBeInstanceOf(PaymentCurrencyMismatchError);
  });

  it('rechaza autorización por monto inválido o que excede el saldo pendiente', async () => {
    const ctx = build();

    const negative = await ctx.authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'test', amount: 0, currency: 'MXN' });
    const tooLarge = await ctx.authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'test', amount: 150, currency: 'MXN' });

    expect(negative.isErr() && negative.error).toBeInstanceOf(PaymentAmountExceedsOrderError);
    expect(tooLarge.isErr() && tooLarge.error).toBeInstanceOf(PaymentAmountExceedsOrderError);
  });

  it('rechaza autorización si la orden ya está pagada o cancelada', async () => {
    const ctx = build();
    ctx.orders.orders.set('order-paid', { id: 'order-paid', storeId: 'default', currencyCode: 'MXN', total: 100, paidAmount: 100, paymentStatus: 'paid', status: 'confirmed' });

    const result = await ctx.authorize.execute({ storeId: 'default', orderId: 'order-paid', providerCode: 'test', amount: 100, currency: 'MXN' });

    expect(result.isErr() && result.error).toBeInstanceOf(OrderNotPayableError);
  });

  it('rechaza autorización si el método está mal configurado (sin webhookSecret/credenciales)', async () => {
    const ctx = build();
    // Re-guarda el método sin credenciales válidas: queda misconfigured.
    void ctx.methods.save({
      id: 'default-test', storeId: 'default', providerCode: 'test', displayName: 'Test', enabled: true,
      credentials: {}, webhookSecret: null, captureMode: 'automatic',
    });

    const result = await ctx.authorize.execute({ storeId: 'default', orderId: 'order-1', providerCode: 'test', amount: 100, currency: 'MXN' });

    expect(result.isErr() && result.error).toBeInstanceOf(PaymentMethodUnavailableError);
  });
});
