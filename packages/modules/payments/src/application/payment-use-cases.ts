import { err, ok, type EventBus, type Result, type UseCase } from '@mitama/core';
import type { DomainEvent } from '@mitama/core';
import { Payment } from '../domain/payment.entity';
import { PaymentWebhookEvent } from '../domain/payment-webhook-event.entity';
import type { PaymentProviderRegistry } from '../domain/payment-provider';
import type { PaymentProviderConfigResolver } from '../domain/payment-provider-config-resolver';
import type { PaymentRepository } from '../domain/payment.repository';
import type { PaymentWebhookEventRepository } from '../domain/payment-webhook-event.repository';
import type { PublicStorePaymentMethod, StorePaymentMethodRepository } from '../domain/store-payment-method.repository';
import { toPublicPaymentMethod } from '../domain/store-payment-method.repository';
import {
  DuplicateWebhookEventError,
  InvalidPaymentTransitionError,
  InvalidWebhookSignatureError,
  PaymentMethodUnavailableError,
  PaymentNotFoundError,
  PaymentNotRefundableError,
  PaymentProviderNotFoundError,
  RefundAmountExceededError,
  TransientPaymentProviderError,
} from '../domain/errors';
import { toPaymentOutput, type PaymentOutput } from './payment.dto';

export class ListPaymentMethodsUseCase implements UseCase<string, Result<PublicStorePaymentMethod[], never>> {
  constructor(private readonly methods: StorePaymentMethodRepository) {}

  async execute(storeId: string): Promise<Result<PublicStorePaymentMethod[], never>> {
    return ok((await this.methods.findEnabled(storeId)).map(toPublicPaymentMethod));
  }
}

export interface AuthorizePaymentInput {
  storeId: string;
  orderId: string;
  providerCode: string;
  amount: number;
  currency: string;
}

type PaymentUseCaseError = PaymentNotFoundError | PaymentProviderNotFoundError | PaymentMethodUnavailableError | InvalidPaymentTransitionError | RefundAmountExceededError | PaymentNotRefundableError | Error;

export class AuthorizePaymentUseCase implements UseCase<AuthorizePaymentInput, Result<PaymentOutput, PaymentUseCaseError>> {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly methods: StorePaymentMethodRepository,
    private readonly registry: PaymentProviderRegistry,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: AuthorizePaymentInput): Promise<Result<PaymentOutput, PaymentUseCaseError>> {
    const method = await this.methods.findEnabledByProvider(input.storeId, input.providerCode);
    if (!method) return err(new PaymentMethodUnavailableError(input.providerCode));
    const provider = this.registry.get(input.providerCode);
    if (!provider) return err(new PaymentProviderNotFoundError(input.providerCode));
    const payment = Payment.create(input);
    const result = await provider.authorize({ ...input, paymentId: payment.id, config: method });
    if (result.isErr()) return err(result.error);
    try {
      payment.setProviderReference(result.value.providerReference);
      payment.transition(result.value.status, 'Autorización de provider', result.value.occurredAt);
    } catch (error) {
      return err(error as InvalidPaymentTransitionError);
    }
    await this.payments.save(payment);
    await publishPaymentEvent(this.eventBus, payment);
    return ok(toPaymentOutput(payment));
  }
}

export class CapturePaymentUseCase implements UseCase<{ paymentId: string }, Result<PaymentOutput, PaymentUseCaseError>> {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly methods: StorePaymentMethodRepository,
    private readonly registry: PaymentProviderRegistry,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: { paymentId: string }): Promise<Result<PaymentOutput, PaymentUseCaseError>> {
    const payment = await this.payments.findById(input.paymentId);
    if (!payment) return err(new PaymentNotFoundError(input.paymentId));
    const method = await this.methods.findEnabledByProvider(payment.storeId, payment.providerCode);
    if (!method) return err(new PaymentMethodUnavailableError(payment.providerCode));
    const provider = this.registry.get(payment.providerCode);
    if (!provider) return err(new PaymentProviderNotFoundError(payment.providerCode));
    const result = await provider.capture({ paymentId: payment.id, orderId: payment.orderId, amount: payment.amount, currency: payment.currency, config: method });
    if (result.isErr()) return err(result.error);
    try {
      payment.setProviderReference(result.value.providerReference);
      payment.transition(result.value.status, 'Captura de provider', result.value.occurredAt);
    } catch (error) {
      return err(error as InvalidPaymentTransitionError);
    }
    await this.payments.save(payment);
    await publishPaymentEvent(this.eventBus, payment);
    return ok(toPaymentOutput(payment));
  }
}

export class VoidPaymentUseCase implements UseCase<{ paymentId: string }, Result<PaymentOutput, PaymentUseCaseError>> {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly methods: StorePaymentMethodRepository,
    private readonly registry: PaymentProviderRegistry,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: { paymentId: string }): Promise<Result<PaymentOutput, PaymentUseCaseError>> {
    const payment = await this.payments.findById(input.paymentId);
    if (!payment) return err(new PaymentNotFoundError(input.paymentId));
    const method = await this.methods.findEnabledByProvider(payment.storeId, payment.providerCode);
    if (!method) return err(new PaymentMethodUnavailableError(payment.providerCode));
    const provider = this.registry.get(payment.providerCode);
    if (!provider) return err(new PaymentProviderNotFoundError(payment.providerCode));
    const result = await provider.void({ paymentId: payment.id, orderId: payment.orderId, amount: payment.amount, currency: payment.currency, config: method });
    if (result.isErr()) return err(result.error);
    try {
      payment.transition('voided', 'Void de autorización', result.value.occurredAt);
    } catch (error) {
      return err(error as InvalidPaymentTransitionError);
    }
    await this.payments.save(payment);
    await publishPaymentEvent(this.eventBus, payment);
    return ok(toPaymentOutput(payment));
  }
}

export class MarkManualPaymentPaidUseCase implements UseCase<{ paymentId: string; actorId: string }, Result<PaymentOutput, PaymentUseCaseError>> {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: { paymentId: string; actorId: string }): Promise<Result<PaymentOutput, PaymentUseCaseError>> {
    const payment = await this.payments.findById(input.paymentId);
    if (!payment) return err(new PaymentNotFoundError(input.paymentId));
    try {
      payment.transition('paid', `Marcado manualmente por ${input.actorId}`);
    } catch (error) {
      return err(error as InvalidPaymentTransitionError);
    }
    await this.payments.save(payment);
    await this.eventBus.publish(paymentEvent('payment.manual_marked_paid', payment, { actorId: input.actorId }));
    await publishPaymentEvent(this.eventBus, payment);
    return ok(toPaymentOutput(payment));
  }
}

export class RefundPaymentUseCase implements UseCase<{ paymentId: string; amount: number }, Result<PaymentOutput, PaymentUseCaseError>> {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly methods: StorePaymentMethodRepository,
    private readonly registry: PaymentProviderRegistry,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: { paymentId: string; amount: number }): Promise<Result<PaymentOutput, PaymentUseCaseError>> {
    const payment = await this.payments.findById(input.paymentId);
    if (!payment) return err(new PaymentNotFoundError(input.paymentId));
    const method = await this.methods.findEnabledByProvider(payment.storeId, payment.providerCode);
    if (!method) return err(new PaymentMethodUnavailableError(payment.providerCode));
    const provider = this.registry.get(payment.providerCode);
    if (!provider) return err(new PaymentProviderNotFoundError(payment.providerCode));
    let refund;
    try {
      refund = payment.requestRefund(input.amount);
    } catch (error) {
      return err(error as RefundAmountExceededError | PaymentNotRefundableError);
    }
    const result = await provider.refund({ paymentId: payment.id, orderId: payment.orderId, amount: input.amount, currency: payment.currency, config: method, refundId: refund.id });
    if (result.isErr()) return err(result.error);
    payment.setRefundProviderReference(refund.id, result.value.providerReference);
    await this.payments.save(payment);
    await this.eventBus.publish(paymentEvent('payment.refund_requested', payment, { refundId: refund.id, amount: input.amount }));
    return ok(toPaymentOutput(payment));
  }
}

export class HandlePaymentWebhookUseCase implements UseCase<{ providerCode: string; headers: Record<string, string | string[] | undefined>; rawBody: string }, Result<{ duplicate: boolean }, InvalidWebhookSignatureError | PaymentProviderNotFoundError | PaymentNotFoundError | DuplicateWebhookEventError | TransientPaymentProviderError | Error>> {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly webhooks: PaymentWebhookEventRepository,
    private readonly registry: PaymentProviderRegistry,
    private readonly configResolver: PaymentProviderConfigResolver,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: { providerCode: string; headers: Record<string, string | string[] | undefined>; rawBody: string }): Promise<Result<{ duplicate: boolean }, InvalidWebhookSignatureError | PaymentProviderNotFoundError | PaymentNotFoundError | DuplicateWebhookEventError | TransientPaymentProviderError | Error>> {
    const provider = this.registry.get(input.providerCode);
    if (!provider) return err(new PaymentProviderNotFoundError(input.providerCode));
    const webhookSecret = this.configResolver.getWebhookSecret(input.providerCode);
    if (!webhookSecret) return err(new InvalidWebhookSignatureError());
    const config = { webhookSecret };
    const parsed = await provider.handleWebhook({ ...input, config });
    if (parsed.isErr()) {
      if (!(parsed.error instanceof TransientPaymentProviderError)) return err(parsed.error);
      const eventId = eventIdFromRawBody(input.rawBody);
      if (!eventId) return err(parsed.error);
      const event = await this.claimOrLoadEvent(input.providerCode, eventId, input.rawBody);
      if (!event) return ok({ duplicate: true });
      event.attempts += 1;
      event.lastError = parsed.error.message;
      if (event.attempts > event.maxAttempts) {
        event.status = 'failed';
        await this.webhooks.save(event);
        return err(new Error('El webhook excedió el máximo de reintentos'));
      }
      await this.webhooks.save(event);
      return err(parsed.error);
    }
    const event = await this.claimOrLoadEvent(input.providerCode, parsed.value.eventId, input.rawBody);
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
    const payment = await this.payments.findById(parsed.value.paymentId);
    if (!payment) return err(new PaymentNotFoundError(parsed.value.paymentId));
    try {
      payment.setProviderReference(parsed.value.providerReference);
      if (parsed.value.status === 'partially_refunded' || parsed.value.status === 'refunded') {
        payment.markRefundSucceeded({ refundReference: parsed.value.refundReference ?? parsed.value.providerReference ?? null, providerReference: parsed.value.providerReference ?? null, amount: parsed.value.amount ?? null, occurredAt: parsed.value.occurredAt });
      } else {
        payment.transition(parsed.value.status, `Webhook ${parsed.value.eventId}`, parsed.value.occurredAt);
      }
    } catch (error) {
      event.status = 'failed';
      event.lastError = (error as Error).message;
      await this.webhooks.save(event);
      return err(error as InvalidPaymentTransitionError);
    }
    await this.payments.save(payment);
    event.status = 'processed';
    event.processedAt = new Date();
    await this.webhooks.save(event);
    await publishPaymentEvent(this.eventBus, payment);
    return ok({ duplicate: false });
  }

  private async claimOrLoadEvent(providerCode: string, eventId: string, rawBody: string) {
    const event = PaymentWebhookEvent.create({ providerCode, eventId, rawBody });
    if (await this.webhooks.claim(event)) return event;
    const existing = await this.webhooks.findByProviderAndEventId(providerCode, eventId);
    if (!existing || existing.status === 'processed' || existing.status === 'failed') return null;
    if (existing.lastError === null) return null;
    return existing;
  }
}

function eventIdFromRawBody(rawBody: string): string | null {
  try {
    const parsed = JSON.parse(rawBody) as { eventId?: unknown };
    return typeof parsed.eventId === 'string' ? parsed.eventId : null;
  } catch {
    return null;
  }
}

async function publishPaymentEvent(eventBus: EventBus, payment: Payment): Promise<void> {
  if (payment.status === 'authorized') await eventBus.publish(paymentEvent('payment.authorized', payment));
  if (payment.status === 'paid') await eventBus.publish(paymentEvent('payment.paid', payment));
  if (payment.status === 'partially_refunded') await eventBus.publish(paymentEvent('payment.partially_refunded', payment));
  if (payment.status === 'refunded') await eventBus.publish(paymentEvent('payment.refunded', payment));
  if (payment.status === 'voided') await eventBus.publish(paymentEvent('payment.voided', payment));
  if (payment.status === 'failed') await eventBus.publish(paymentEvent('payment.failed', payment));
}

function paymentEvent(name: string, payment: Payment, extra: Record<string, unknown> = {}): DomainEvent {
  return {
    name,
    occurredAt: new Date(),
    payload: {
      paymentId: payment.id,
      orderId: payment.orderId,
      storeId: payment.storeId,
      providerCode: payment.providerCode,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      ...extra,
    },
  };
}
