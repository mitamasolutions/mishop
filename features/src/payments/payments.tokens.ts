export const PAYMENTS_TOKENS = {
  paymentRepository: 'payments.payment-repository',
  webhookRepository: 'payments.webhook-repository',
  storeMethodRepository: 'payments.store-method-repository',
  providerConfigResolver: 'payments.provider-config-resolver',
  providerRegistry: 'payments.provider-registry',
  providers: 'payments.providers',
  credentialCipher: 'payments.credential-cipher',
  mercadoPagoClient: 'payments.mercado-pago-client',
} as const;
