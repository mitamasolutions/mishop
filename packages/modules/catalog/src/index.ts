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
export { ProductCategory } from './domain/product-category.entity';
export type { ProductCategoryRepository } from './domain/product-category.repository';
export type { ProductCategoryOutput } from './application/product-category.dto';
export { Product } from './domain/product.entity';
export type {
  ProductStatus,
  ProductOptionProps,
  ProductOptionValueProps,
  ProductVariantProps,
  ProductSpecificationProps,
  VariantCombination,
  VariantPriceProps,
} from './domain/product.entity';
export type { ProductRepository, ProductFilter, ProductPage } from './domain/product.repository';
export type {
  ProductOutput,
  ProductOptionOutput,
  ProductOptionValueOutput,
  ProductVariantOutput,
  ProductSpecificationOutput,
  VariantPriceOutput,
} from './application/product.dto';
export type { ListProductsInput, ListProductsOutput, ListProductsOutputItem } from './application/list-products/list-products.dto';
export type { VariantCombinationPreview } from './application/manage-product-variants/preview-variant-matrix.use-case';
export { PriceList } from './domain/price-list.entity';
export type { PriceListStatus, PriceListType, PriceListPriceProps } from './domain/price-list.entity';
export type { PriceListRepository, PriceListFilter, PriceListPage } from './domain/price-list.repository';
export type { PriceListOutput, PriceListPriceOutput } from './application/price-list.dto';
export type { ListPriceListsInput, ListPriceListsOutput } from './application/list-price-lists/list-price-lists.dto';
export type { EffectivePriceOutput, EffectivePriceSource, GetEffectivePriceInput } from './application/get-effective-price/get-effective-price.dto';
