/**
 * API pública del módulo catalog. Otros paquetes SOLO pueden importar de aquí
 * (regla 3 de arquitectura).
 */
export { CatalogModule } from './catalog.module';
export { CATALOG_TOKENS } from './catalog.tokens';
export { Brand } from './domain/brand.entity';
export type { BrandRepository, SlugRedirect } from './domain/brand.repository';
export type { BrandOutput } from './application/brand.dto';
export { slugify } from './domain/slug';
export type { ValueTaxonomyOutput } from './application/value-taxonomy.dto';
export type { SalesChannelOutput } from './application/sales-channel.dto';
export type { ProductCollectionOutput } from './application/product-collection.dto';
