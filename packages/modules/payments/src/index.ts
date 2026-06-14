/**
 * API pública del módulo payments. Otros paquetes SOLO pueden importar de aquí
 * (regla 3 de arquitectura). Los eventos compartidos viven en @mitama/contracts.
 */
export { PaymentsModule } from './payments.module';
export { PaymentProviderRegistry } from './domain/payment-provider';
export type { PaymentProvider } from './domain/payment-provider';
