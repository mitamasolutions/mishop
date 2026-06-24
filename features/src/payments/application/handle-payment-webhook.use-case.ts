import { err, ok, type EventBus, type Result, type UseCase } from '@mitama/core';
import { PaymentWebhookEvent, type PaymentWebhookEventProps } from '../domain/payment-webhook-event.entity';
import type { PaymentWebhookResult, PaymentProviderRegistry } from '../domain/payment-provider';
import type { Payment } from '../domain/payment.entity';
import type { PaymentReader, PaymentReferenceReader, PaymentWriter } from '../domain/payment.repository';
import type { PaymentWebhookEventRepository } from '../domain/payment-webhook-event.repository';
import type { StorePaymentMethod, StorePaymentMethodRepository } from '../domain/store-payment-method.repository';
import { toDecryptedConfig } from '../domain/store-payment-method.repository';
import {
  DuplicateWebhookEventError,
  InvalidPaymentTransitionError,
  InvalidWebhookSignatureError,
  PaymentNotFoundError,
  PaymentProviderNotFoundError,
  TransientPaymentProviderError,
} from '../domain/errors';
import { publishPaymentEvent } from './payment-events';

export interface HandlePaymentWebhookInput {
  providerCode: string;
  headers: Record<string, string | string[] | undefined>;
  rawBody: string;
}

type HandlePaymentWebhookError =
  | InvalidWebhookSignatureError
  | PaymentProviderNotFoundError
  | PaymentNotFoundError
  | DuplicateWebhookEventError
  | TransientPaymentProviderError
  | Error;

export class HandlePaymentWebhookUseCase
  implements UseCase<HandlePaymentWebhookInput, Result<{ duplicate: boolean }, HandlePaymentWebhookError>>
{
  constructor(
    private readonly paymentReader: PaymentReader,
    private readonly paymentReferenceReader: PaymentReferenceReader,
    private readonly paymentWriter: PaymentWriter,
    private readonly webhooks: PaymentWebhookEventRepository,
    private readonly methods: StorePaymentMethodRepository,
    private readonly registry: PaymentProviderRegistry,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: HandlePaymentWebhookInput): Promise<Result<{ duplicate: boolean }, HandlePaymentWebhookError>> {
    const provider = this.registry.get(input.providerCode);
    if (!provider) return err(new PaymentProviderNotFoundError(input.providerCode));

    const methods = await this.methods.findEnabledByProviderAcrossStores(input.providerCode);
    for (const method of methods) {
      const parsed = await provider.handleWebhook({ providerCode: input.providerCode, headers: input.headers, rawBody: input.rawBody, config: toDecryptedConfig(method) });
      if (parsed.isErr()) {
        if (parsed.error instanceof InvalidWebhookSignatureError) continue;
        if (parsed.error instanceof TransientPaymentProviderError) return this.recordTransientWebhook(input, method, parsed.error);
        return err(parsed.error);
      }

      const payment = await this.resolveWebhookPayment(input.providerCode, parsed.value);
      if (!payment) return err(new PaymentNotFoundError(parsed.value.paymentId));

      const storeMethod = await this.methods.findByProvider(payment.storeId, input.providerCode);
      if (!storeMethod || !storeMethod.webhookSecret) return err(new InvalidWebhookSignatureError());
      if (storeMethod.storeId !== method.storeId) {
        const storeParsed = await provider.handleWebhook({ providerCode: input.providerCode, headers: input.headers, rawBody: input.rawBody, config: toDecryptedConfig(storeMethod) });
        if (storeParsed.isErr()) return err(storeParsed.error);
      }

      const event = await this.claimOrLoadEvent(payment.storeId, input.providerCode, parsed.value.eventId, input.rawBody);
      if (!event) return ok({ duplicate: true });
      event.attempts += 1;
      event.status = 'received';
      event.lastError = null;
      if (event.attempts > event.maxAttempts) {
        event.status = 'failed';
        event.lastError = 'El webhook excedió el máximo de reintentos';
        await this.webhooks.save(event);
        return err(new Error(event.lastError));
      }
      await this.webhooks.save(event);

      return this.applyWebhookToPayment(payment, event, parsed.value);
    }

    return err(new InvalidWebhookSignatureError());
  }

  private async recordTransientWebhook(
    input: HandlePaymentWebhookInput,
    method: StorePaymentMethod,
    error: TransientPaymentProviderError,
  ): Promise<Result<{ duplicate: boolean }, HandlePaymentWebhookError>> {
    const eventId = eventIdFromRawBody(input.rawBody);
    const paymentReference = paymentReferenceFromRawBody(input.rawBody);
    if (!eventId || !paymentReference) return err(error);
    const payment = await this.resolveWebhookPayment(input.providerCode, { paymentId: paymentReference, providerReference: paymentReference } as PaymentWebhookResult);
    if (!payment) return err(new PaymentNotFoundError(paymentReference));
    if (payment.storeId !== method.storeId) return err(new InvalidWebhookSignatureError());
    const event = await this.claimOrLoadEvent(payment.storeId, input.providerCode, eventId, input.rawBody);
    if (!event) return ok({ duplicate: true });
    event.attempts += 1;
    event.lastError = error.message;
    if (event.attempts > event.maxAttempts) {
      event.status = 'failed';
      await this.webhooks.save(event);
      return err(new Error('El webhook excedió el máximo de reintentos'));
    }
    await this.webhooks.save(event);
    return err(error);
  }

  private async resolveWebhookPayment(
    providerCode: string,
    parsed: Pick<PaymentWebhookResult, 'paymentId' | 'providerReference'>,
  ): Promise<Payment | null> {
    const local = await this.paymentReader.findById(parsed.paymentId);
    if (local?.providerCode === providerCode) return local;
    const reference = parsed.providerReference ?? parsed.paymentId;
    return this.paymentReferenceReader.findByProviderReferenceAnyStore(providerCode, reference);
  }

  private async applyWebhookToPayment(
    payment: Payment,
    event: PaymentWebhookEventProps,
    parsed: PaymentWebhookResult,
  ): Promise<Result<{ duplicate: boolean }, InvalidPaymentTransitionError>> {
    try {
      payment.setProviderReference(parsed.providerReference);
      if (parsed.status === 'partially_refunded' || parsed.status === 'refunded') {
        payment.markRefundSucceeded({ refundReference: parsed.refundReference ?? parsed.providerReference ?? null, providerReference: parsed.providerReference ?? null, amount: parsed.amount ?? null, occurredAt: parsed.occurredAt });
      } else {
        payment.transition(parsed.status, `Webhook ${parsed.eventId}`, parsed.occurredAt);
      }
    } catch (error) {
      event.status = 'failed';
      event.lastError = (error as Error).message;
      await this.webhooks.save(event);
      return err(error as InvalidPaymentTransitionError);
    }
    await this.paymentWriter.save(payment);
    event.status = 'processed';
    event.processedAt = new Date();
    await this.webhooks.save(event);
    await publishPaymentEvent(this.eventBus, payment);
    return ok({ duplicate: false });
  }

  private async claimOrLoadEvent(
    storeId: string,
    providerCode: string,
    eventId: string,
    rawBody: string,
  ): Promise<PaymentWebhookEventProps | null> {
    const event = PaymentWebhookEvent.create({ storeId, providerCode, eventId, rawBody });
    if (await this.webhooks.claim(event)) return event;
    const existing = await this.webhooks.findByStoreProviderAndEventId(storeId, providerCode, eventId);
    if (!existing || existing.status === 'processed' || existing.status === 'failed') return null;
    if (existing.lastError === null) return null;
    return existing;
  }
}

function eventIdFromRawBody(rawBody: string): string | null {
  try {
    const parsed = JSON.parse(rawBody) as { eventId?: unknown; data?: { id?: unknown }; action?: unknown; type?: unknown };
    if (typeof parsed.eventId === 'string') return parsed.eventId;
    if (typeof parsed.data?.id === 'string') return `${parsed.data.id}:${typeof parsed.action === 'string' ? parsed.action : typeof parsed.type === 'string' ? parsed.type : 'update'}`;
    return null;
  } catch {
    return null;
  }
}

function paymentReferenceFromRawBody(rawBody: string): string | null {
  try {
    const parsed = JSON.parse(rawBody) as { paymentId?: unknown; data?: { id?: unknown } };
    if (typeof parsed.paymentId === 'string') return parsed.paymentId;
    if (typeof parsed.data?.id === 'string') return parsed.data.id;
    return null;
  } catch {
    return null;
  }
}
