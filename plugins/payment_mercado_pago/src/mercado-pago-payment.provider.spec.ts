import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { InvalidWebhookSignatureError, type PaymentStatus } from '@mitama/contracts';
import { MercadoPagoPaymentProvider, type MercadoPagoClient } from './mercado-pago-payment.provider';

const validConfig = {
  credentials: { accessToken: 'access-token', publicKey: 'public-key' },
  webhookSecret: 'webhook-secret',
  captureMode: 'automatic' as const,
};

function makeClient(): MercadoPagoClient {
  return {
    createPreference: vi.fn(),
    refundPayment: vi.fn(),
    getPaymentStatus: vi.fn(),
  };
}

function sign(input: { dataId: string; requestId: string; timestamp: string; secret: string }) {
  return createHmac('sha256', input.secret)
    .update(`id:${input.dataId};request-id:${input.requestId};ts:${input.timestamp};`)
    .digest('hex');
}

function signedWebhook(input: { dataId?: string; action?: string; status?: PaymentStatus } = {}) {
  const dataId = input.dataId ?? 'mp-payment-1';
  const requestId = 'request-1';
  const timestamp = '1710000000';
  const rawBody = JSON.stringify({ action: input.action ?? 'payment.updated', data: { id: dataId } });
  const signature = sign({ dataId, requestId, timestamp, secret: validConfig.webhookSecret });
  return {
    rawBody,
    headers: {
      'x-request-id': requestId,
      'x-signature': `ts=${timestamp},v1=${signature}`,
    },
    status: input.status ?? 'paid',
  };
}

describe('MercadoPagoPaymentProvider', () => {
  it('valida configuración completa y detecta faltantes', () => {
    const provider = new MercadoPagoPaymentProvider(makeClient());

    expect(provider.validateConfig(validConfig)).toEqual({ state: 'configured' });
    expect(provider.validateConfig({ credentials: {}, webhookSecret: null, captureMode: 'automatic' })).toMatchObject({
      state: 'misconfigured',
      missing: ['accessToken', 'publicKey', 'webhookSecret'],
    });
    expect(provider.validateConfig({ ...validConfig, captureMode: 'manual' })).toMatchObject({
      state: 'misconfigured',
      missing: ['captureMode'],
    });
  });

  it('autoriza creando una preferencia y rechaza si falta accessToken', async () => {
    const client = makeClient();
    vi.mocked(client.createPreference).mockResolvedValue({ preferenceId: 'pref-1', initPoint: 'https://mp.test/pref-1' });
    const provider = new MercadoPagoPaymentProvider(client);

    const ok = await provider.authorize({ paymentId: 'pay-1', orderId: 'order-1', amount: 100, currency: 'MXN', config: validConfig });
    const missing = await provider.authorize({ paymentId: 'pay-1', orderId: 'order-1', amount: 100, currency: 'MXN', config: { ...validConfig, credentials: {} } });

    expect(ok.isOk()).toBe(true);
    if (ok.isOk()) {
      expect(ok.value).toMatchObject({ providerReference: 'pref-1', status: 'pending' });
    }
    expect(missing.isErr()).toBe(true);
  });

  it('reembolsa usando providerReference y rechaza si falta', async () => {
    const client = makeClient();
    vi.mocked(client.refundPayment).mockResolvedValue({ refundId: 'refund-1' });
    const provider = new MercadoPagoPaymentProvider(client);

    const ok = await provider.refund({
      paymentId: 'local-payment-1',
      providerReference: 'mp-payment-1',
      orderId: 'order-1',
      amount: 50,
      currency: 'MXN',
      config: validConfig,
      refundId: 'local-refund-1',
    });
    const missing = await provider.refund({
      paymentId: 'local-payment-1',
      orderId: 'order-1',
      amount: 50,
      currency: 'MXN',
      config: validConfig,
      refundId: 'local-refund-2',
    });

    expect(ok.isOk()).toBe(true);
    expect(client.refundPayment).toHaveBeenCalledWith({
      accessToken: 'access-token',
      providerPaymentId: 'mp-payment-1',
      amount: 50,
      refundId: 'local-refund-1',
    });
    expect(missing.isErr()).toBe(true);
  });

  it('rechaza webhooks con firma inválida', async () => {
    const provider = new MercadoPagoPaymentProvider(makeClient());
    const webhook = signedWebhook();

    const result = await provider.handleWebhook({
      providerCode: 'mercado-pago',
      rawBody: webhook.rawBody,
      headers: { ...webhook.headers, 'x-signature': 'ts=1710000000,v1=bad' },
      config: validConfig,
    });

    expect(result.isErr() && result.error).toBeInstanceOf(InvalidWebhookSignatureError);
  });

  it.each<PaymentStatus>(['paid', 'refunded', 'failed'])('usa el estado real del webhook: %s', async (status) => {
    const client = makeClient();
    vi.mocked(client.getPaymentStatus).mockResolvedValue({ status, amount: 100 });
    const provider = new MercadoPagoPaymentProvider(client);
    const webhook = signedWebhook({ status });

    const result = await provider.handleWebhook({
      providerCode: 'mercado-pago',
      rawBody: webhook.rawBody,
      headers: webhook.headers,
      config: validConfig,
    });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value).toMatchObject({
      eventId: 'mp-payment-1:payment.updated',
      paymentId: 'mp-payment-1',
      providerReference: 'mp-payment-1',
      status,
      amount: 100,
    });
    expect(client.getPaymentStatus).toHaveBeenCalledWith({ accessToken: 'access-token', providerPaymentId: 'mp-payment-1' });
  });

  it('rechaza body no JSON', async () => {
    const provider = new MercadoPagoPaymentProvider(makeClient());

    const result = await provider.handleWebhook({
      providerCode: 'mercado-pago',
      rawBody: '{no-json',
      headers: {},
      config: validConfig,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.message).toBe('Mercado Pago webhook: body no es JSON válido');
  });
});
