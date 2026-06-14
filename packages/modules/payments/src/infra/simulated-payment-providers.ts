import { createHmac, timingSafeEqual } from 'node:crypto';
import { err, ok, type Result } from '@mitama/core';
import { InvalidWebhookSignatureError, TransientPaymentProviderError } from '../domain/errors';
import type { PaymentProvider, PaymentProviderRequest, PaymentProviderResult, PaymentWebhookRequest, PaymentWebhookResult } from '../domain/payment-provider';

abstract class SimulatedOnlinePaymentProvider implements PaymentProvider {
  abstract readonly code: string;
  abstract readonly displayName: string;

  async authorize(input: PaymentProviderRequest): Promise<Result<PaymentProviderResult, Error>> {
    return ok({ providerReference: `${this.code}_${input.paymentId}`, status: input.config.captureMode === 'manual' ? 'authorized' : 'paid', occurredAt: new Date() });
  }

  async capture(input: PaymentProviderRequest): Promise<Result<PaymentProviderResult, Error>> {
    return ok({ providerReference: `${this.code}_${input.paymentId}`, status: 'paid', occurredAt: new Date() });
  }

  async refund(input: PaymentProviderRequest & { refundId: string }): Promise<Result<PaymentProviderResult, Error>> {
    return ok({ providerReference: `${this.code}_refund_${input.refundId}`, status: 'pending', occurredAt: new Date() });
  }

  async void(input: PaymentProviderRequest): Promise<Result<PaymentProviderResult, Error>> {
    return ok({ providerReference: `${this.code}_void_${input.paymentId}`, status: 'voided', occurredAt: new Date() });
  }

  async handleWebhook(input: PaymentWebhookRequest): Promise<Result<PaymentWebhookResult, InvalidWebhookSignatureError | TransientPaymentProviderError | Error>> {
    const body = JSON.parse(input.rawBody) as { eventId: string; paymentId: string; status: PaymentWebhookResult['status']; providerReference?: string; refundReference?: string; amount?: number; occurredAt?: string; transientFailure?: boolean };
    if (!isValidSignature(input.headers['x-mitama-signature'], input.rawBody, input.config?.webhookSecret ?? 'test-secret')) {
      return err(new InvalidWebhookSignatureError());
    }
    if (body.transientFailure) return err(new TransientPaymentProviderError());
    return ok({
      eventId: body.eventId,
      paymentId: body.paymentId,
      status: body.status,
      providerReference: body.providerReference ?? null,
      refundReference: body.refundReference ?? null,
      amount: body.amount ?? null,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
    });
  }
}

export class StripePaymentProvider extends SimulatedOnlinePaymentProvider {
  readonly code = 'stripe';
  readonly displayName = 'Stripe';
}

export class MercadoPagoPaymentProvider extends SimulatedOnlinePaymentProvider {
  readonly code = 'mercado-pago';
  readonly displayName = 'Mercado Pago';
}

export class ManualPaymentProvider implements PaymentProvider {
  readonly code: string = 'manual';
  readonly displayName: string = 'Transferencia manual';

  async authorize(input: PaymentProviderRequest): Promise<Result<PaymentProviderResult, Error>> {
    return ok({ providerReference: `manual_${input.paymentId}`, status: 'pending', occurredAt: new Date() });
  }

  async capture(input: PaymentProviderRequest): Promise<Result<PaymentProviderResult, Error>> {
    return ok({ providerReference: `manual_${input.paymentId}`, status: 'paid', occurredAt: new Date() });
  }

  async refund(input: PaymentProviderRequest & { refundId: string }): Promise<Result<PaymentProviderResult, Error>> {
    return ok({ providerReference: `manual_refund_${input.refundId}`, status: 'pending', occurredAt: new Date() });
  }

  async void(input: PaymentProviderRequest): Promise<Result<PaymentProviderResult, Error>> {
    return ok({ providerReference: `manual_void_${input.paymentId}`, status: 'voided', occurredAt: new Date() });
  }

  async handleWebhook(): Promise<Result<PaymentWebhookResult, Error>> {
    return err(new Error('El provider manual no recibe webhooks'));
  }
}

export class CashPaymentProvider extends ManualPaymentProvider {
  override readonly code = 'cash';
  override readonly displayName = 'Efectivo';
}

function isValidSignature(signature: string | string[] | undefined, rawBody: string, secret: string): boolean {
  const received = Array.isArray(signature) ? signature[0] : signature;
  if (!received) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}
