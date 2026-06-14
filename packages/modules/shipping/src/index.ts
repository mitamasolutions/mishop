/**
 * API pública del módulo shipping. Otros paquetes SOLO pueden importar de aquí
 * (regla 3 de arquitectura). Los eventos compartidos viven en @mitama/contracts.
 */
export { ShippingModule } from './shipping.module';
export { ShippingProviderRegistry } from './domain/shipping-provider';
export type { ShippingProvider } from './domain/shipping-provider';
