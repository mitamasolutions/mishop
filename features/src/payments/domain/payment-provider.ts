import type { PaymentProvider } from '@mitama/contracts';

/**
 * Registry de providers de pago. Vive en el dominio de `payments` (no en
 * contracts) porque es estado mutable de composición, no un contrato.
 * Los plugins implementan `PaymentProvider` (re-exportado desde
 * `@mitama/contracts`) y se registran aquí desde el módulo Nest.
 */
export class PaymentProviderRegistry {
  private readonly providers = new Map<string, PaymentProvider>();

  constructor(providers: PaymentProvider[] = []) {
    providers.forEach((provider) => this.register(provider));
  }

  register(provider: PaymentProvider): void {
    if (this.providers.has(provider.code)) throw new Error(`Provider de pago duplicado: ${provider.code}`);
    this.providers.set(provider.code, provider);
  }

  get(code: string): PaymentProvider | null {
    return this.providers.get(code) ?? null;
  }

  list(): PaymentProvider[] {
    return [...this.providers.values()];
  }
}

// Re-export del contrato para compatibilidad con consumidores internos
// (los use cases siguen importando desde 'payment-provider' relativo).
export type {
  PaymentProvider,
  PaymentProviderConfig,
  PaymentProviderRequest,
  PaymentProviderResult,
  PaymentWebhookRequest,
  PaymentWebhookResult,
  PaymentProviderConfigDescriptor,
  PaymentProviderConfigFieldDescriptor,
  PaymentProviderConfigStatus,
  DecryptedPaymentMethodConfig,
} from '@mitama/contracts';
