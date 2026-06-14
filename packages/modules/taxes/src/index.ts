/**
 * API pública del módulo taxes. Otros paquetes SOLO pueden importar de aquí
 * (regla 3 de arquitectura). Los eventos compartidos viven en @mitama/contracts.
 */
export { TaxesModule } from './taxes.module';
export { TaxProviderRegistry } from './domain/tax-provider';
export type { TaxProvider } from './domain/tax-provider';
