import { ok, err, type Result } from '@mitama/core';
import type {
  DecryptedPaymentMethodConfig,
  PaymentProvider,
  PaymentProviderConfigDescriptor,
  PaymentProviderConfigStatus,
  PaymentProviderRequest,
  PaymentProviderResult,
  PaymentWebhookRequest,
  PaymentWebhookResult,
} from '@mitama/contracts';

/**
 * Plugin de **pago manual / transferencia** (r14 · sprint1_cierre).
 *
 * No llama a ninguna pasarela: `authorize` deja el pago en `pending` y un
 * operador con permiso (`MarkManualPaymentPaidUseCase`) lo marca como
 * pagado. No recibe webhooks. No requiere configuración: queda `configured`
 * en cuanto se habilita.
 */
export class ManualPaymentProvider implements PaymentProvider {
  readonly code: string = 'manual';
  readonly displayName: string = 'Transferencia manual';
  readonly configDescriptor: PaymentProviderConfigDescriptor = {
    fields: [
      {
        key: 'instructions',
        label: 'Instrucciones de pago',
        type: 'string',
        required: false,
        description: 'Texto que se muestra al comprador (banco, CLABE, referencia).',
      },
    ],
  };

  validateConfig(_config: DecryptedPaymentMethodConfig): PaymentProviderConfigStatus {
    return { state: 'configured' };
  }

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

  async handleWebhook(_input: PaymentWebhookRequest): Promise<Result<PaymentWebhookResult, Error>> {
    return err(new Error('El provider manual no recibe webhooks'));
  }
}

/** Mismo comportamiento que `manual` pero código distinto para POS / efectivo. */
export class CashPaymentProvider extends ManualPaymentProvider {
  override readonly code = 'cash';
  override readonly displayName = 'Efectivo';
}
