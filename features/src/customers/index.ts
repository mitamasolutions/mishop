/**
 * API pública del módulo customers. Otros paquetes SOLO pueden importar de aquí
 * (regla 3 de arquitectura). Los eventos compartidos viven en @mitama/contracts.
 */
export { CustomersModule } from './customers.module';
export { CUSTOMERS_TOKENS } from './customers.tokens';
export { Customer, normalizeEmail } from './domain/customer.entity';
export type { CustomerAddressInput, CustomerAddressProps } from './domain/customer.entity';
export type { CustomerRepository } from './domain/customer.repository';
export type { CustomerOutput, CustomerAddressOutput } from './application/customer.dto';
