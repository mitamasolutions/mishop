/**
 * API pública del módulo stores. Otros paquetes SOLO pueden importar de aquí
 * (regla 3 de arquitectura). Los eventos compartidos viven en @mitama/contracts.
 */
export { StoresModule } from './stores.module';
export { STORES_TOKENS } from './stores.tokens';
export { Store } from './domain/store.entity';
export type { StoreRepository } from './domain/store.repository';
export type { StoreOutput } from './application/store.dto';
