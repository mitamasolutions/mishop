import { Injectable } from '@nestjs/common';
import type { PaymentProviderConfigResolver } from '../domain/payment-provider-config-resolver';

@Injectable()
export class EnvPaymentProviderConfigResolver implements PaymentProviderConfigResolver {
  getWebhookSecret(providerCode: string): string | null {
    const normalized = providerCode.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    return process.env[`PAYMENTS_${normalized}_WEBHOOK_SECRET`] ?? null;
  }
}
