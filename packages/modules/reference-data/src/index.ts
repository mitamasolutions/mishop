/**
 * API pública del módulo reference-data. Otros paquetes SOLO pueden importar de aquí
 * (regla 3 de arquitectura). Los eventos compartidos viven en @mitama/contracts.
 */
export { ReferenceDataModule } from './reference-data.module';
export { REFERENCE_DATA_TOKENS } from './reference-data.tokens';
export { Currency } from './domain/currency.entity';
export { Region } from './domain/region.entity';
export { Country } from './domain/country.entity';
export type { CurrencyRepository } from './domain/currency.repository';
export type { RegionRepository } from './domain/region.repository';
export type { CountryRepository } from './domain/country.repository';
