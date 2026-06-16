export interface PaymentProviderConfigResolver {
  getWebhookSecret(providerCode: string): string | null;
}
