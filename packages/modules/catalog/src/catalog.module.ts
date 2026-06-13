/**
 * Composición del módulo catalog: el único lugar donde las capas se conectan
 * (puertos → adapters). Sin lógica de negocio aquí.
 */
import { Module } from '@nestjs/common';
import { PrismaService } from '@mitama/db';
import { CATALOG_TOKENS } from './catalog.tokens';
import { CreateBrandUseCase } from './application/create-brand/create-brand.use-case';
import { UpdateBrandUseCase } from './application/update-brand/update-brand.use-case';
import { SetBrandStatusUseCase } from './application/set-brand-status/set-brand-status.use-case';
import { ListBrandsUseCase } from './application/list-brands/list-brands.use-case';
import { GetBrandUseCase } from './application/get-brand/get-brand.use-case';
import type { BrandRepository } from './domain/brand.repository';
import { PrismaBrandRepository } from './infra/prisma-brand.repository';
import { BrandsController } from './http/brands.controller';

import {
  CreateValueTaxonomyUseCase,
  DeleteValueTaxonomyUseCase,
  GetValueTaxonomyUseCase,
  ListValueTaxonomyUseCase,
  UpdateValueTaxonomyUseCase,
  type ValueTaxonomyConfig,
} from './application/value-taxonomy.use-cases';
import type { ValueTaxonomyRepository } from './domain/value-taxonomy.repository';
import { PrismaValueTaxonomyRepository } from './infra/prisma-value-taxonomy.repository';
import { ProductTagsController } from './http/product-tags.controller';
import { ProductTypesController } from './http/product-types.controller';

import { CreateSalesChannelUseCase } from './application/create-sales-channel/create-sales-channel.use-case';
import { UpdateSalesChannelUseCase } from './application/update-sales-channel/update-sales-channel.use-case';
import { SetSalesChannelStatusUseCase } from './application/set-sales-channel-status/set-sales-channel-status.use-case';
import { ListSalesChannelsUseCase } from './application/list-sales-channels/list-sales-channels.use-case';
import { GetSalesChannelUseCase } from './application/get-sales-channel/get-sales-channel.use-case';
import type { SalesChannelRepository } from './domain/sales-channel.repository';
import { PrismaSalesChannelRepository } from './infra/prisma-sales-channel.repository';
import { SalesChannelsController } from './http/sales-channels.controller';

import { CreateCollectionUseCase } from './application/create-collection/create-collection.use-case';
import { UpdateCollectionUseCase } from './application/update-collection/update-collection.use-case';
import { ListCollectionsUseCase } from './application/list-collections/list-collections.use-case';
import { GetCollectionUseCase } from './application/get-collection/get-collection.use-case';
import type { ProductCollectionRepository } from './domain/product-collection.repository';
import { PrismaProductCollectionRepository } from './infra/prisma-product-collection.repository';
import { CollectionsController } from './http/collections.controller';

import { CreateCategoryUseCase } from './application/create-category/create-category.use-case';
import { UpdateCategoryUseCase } from './application/update-category/update-category.use-case';
import { MoveCategoryUseCase } from './application/move-category/move-category.use-case';
import { DeleteCategoryUseCase } from './application/delete-category/delete-category.use-case';
import { ListCategoriesUseCase } from './application/list-categories/list-categories.use-case';
import { GetCategoryUseCase } from './application/get-category/get-category.use-case';
import type { ProductCategoryRepository } from './domain/product-category.repository';
import { PrismaProductCategoryRepository } from './infra/prisma-product-category.repository';
import { CategoriesController } from './http/categories.controller';

import { CreateProductUseCase } from './application/create-product/create-product.use-case';
import { UpdateProductUseCase } from './application/update-product/update-product.use-case';
import { DeleteProductUseCase } from './application/delete-product/delete-product.use-case';
import { ListProductsUseCase } from './application/list-products/list-products.use-case';
import { GetProductUseCase } from './application/get-product/get-product.use-case';
import { SetProductStatusUseCase } from './application/set-product-status/set-product-status.use-case';
import { AddProductOptionUseCase } from './application/manage-product-options/add-option.use-case';
import { UpdateProductOptionUseCase } from './application/manage-product-options/update-option.use-case';
import { RemoveProductOptionUseCase } from './application/manage-product-options/remove-option.use-case';
import { AddProductOptionValueUseCase } from './application/manage-product-options/add-option-value.use-case';
import { RemoveProductOptionValueUseCase } from './application/manage-product-options/remove-option-value.use-case';
import { AddVariantUseCase } from './application/manage-product-variants/add-variant.use-case';
import { UpdateVariantUseCase } from './application/manage-product-variants/update-variant.use-case';
import { RemoveVariantUseCase } from './application/manage-product-variants/remove-variant.use-case';
import { PreviewVariantMatrixUseCase } from './application/manage-product-variants/preview-variant-matrix.use-case';
import { AddSpecificationUseCase } from './application/manage-product-specifications/add-specification.use-case';
import { UpdateSpecificationUseCase } from './application/manage-product-specifications/update-specification.use-case';
import { RemoveSpecificationUseCase } from './application/manage-product-specifications/remove-specification.use-case';
import type { ProductRepository } from './domain/product.repository';
import { PrismaProductRepository } from './infra/prisma-product.repository';
import { ProductsController } from './http/products.controller';

import { SetVariantBasePriceUseCase } from './application/manage-product-prices/set-variant-base-price.use-case';
import { AddVariantTierPriceUseCase } from './application/manage-product-prices/add-variant-tier-price.use-case';
import { UpdateVariantTierPriceUseCase } from './application/manage-product-prices/update-variant-tier-price.use-case';
import { RemoveVariantTierPriceUseCase } from './application/manage-product-prices/remove-variant-tier-price.use-case';
import { CreatePriceListUseCase } from './application/create-price-list/create-price-list.use-case';
import { UpdatePriceListUseCase } from './application/update-price-list/update-price-list.use-case';
import { SetPriceListStatusUseCase } from './application/set-price-list-status/set-price-list-status.use-case';
import { ListPriceListsUseCase } from './application/list-price-lists/list-price-lists.use-case';
import { GetPriceListUseCase } from './application/get-price-list/get-price-list.use-case';
import { DeletePriceListUseCase } from './application/delete-price-list/delete-price-list.use-case';
import { AddPriceListPriceUseCase } from './application/manage-price-list-prices/add-price-list-price.use-case';
import { UpdatePriceListPriceUseCase } from './application/manage-price-list-prices/update-price-list-price.use-case';
import { RemovePriceListPriceUseCase } from './application/manage-price-list-prices/remove-price-list-price.use-case';
import { GetEffectivePriceUseCase } from './application/get-effective-price/get-effective-price.use-case';
import type { PriceListRepository } from './domain/price-list.repository';
import { PrismaPriceListRepository } from './infra/prisma-price-list.repository';
import { PriceListsController } from './http/price-lists.controller';

const PRODUCT_TAG_CONFIG: ValueTaxonomyConfig = {
  entityCode: 'PRODUCT_TAG',
  entityLabel: 'La etiqueta de producto',
  actionPrefix: 'product-tag',
  entityType: 'product_tag',
};

const PRODUCT_TYPE_CONFIG: ValueTaxonomyConfig = {
  entityCode: 'PRODUCT_TYPE',
  entityLabel: 'El tipo de producto',
  actionPrefix: 'product-type',
  entityType: 'product_type',
};

@Module({
  controllers: [
    BrandsController,
    ProductTagsController,
    ProductTypesController,
    SalesChannelsController,
    CollectionsController,
    CategoriesController,
    ProductsController,
    PriceListsController,
  ],
  providers: [
    { provide: CATALOG_TOKENS.brandRepository, useClass: PrismaBrandRepository },
    {
      provide: CreateBrandUseCase,
      useFactory: (brands: BrandRepository) => new CreateBrandUseCase(brands),
      inject: [CATALOG_TOKENS.brandRepository],
    },
    {
      provide: UpdateBrandUseCase,
      useFactory: (brands: BrandRepository) => new UpdateBrandUseCase(brands),
      inject: [CATALOG_TOKENS.brandRepository],
    },
    {
      provide: SetBrandStatusUseCase,
      useFactory: (brands: BrandRepository) => new SetBrandStatusUseCase(brands),
      inject: [CATALOG_TOKENS.brandRepository],
    },
    {
      provide: ListBrandsUseCase,
      useFactory: (brands: BrandRepository) => new ListBrandsUseCase(brands),
      inject: [CATALOG_TOKENS.brandRepository],
    },
    {
      provide: GetBrandUseCase,
      useFactory: (brands: BrandRepository) => new GetBrandUseCase(brands),
      inject: [CATALOG_TOKENS.brandRepository],
    },

    // ----- Etiquetas de producto (taxonomía de valor único) -----
    {
      provide: CATALOG_TOKENS.productTagRepository,
      useFactory: (prisma: PrismaService) => new PrismaValueTaxonomyRepository(prisma, 'productTag'),
      inject: [PrismaService],
    },
    {
      provide: CATALOG_TOKENS.createProductTagUseCase,
      useFactory: (repo: ValueTaxonomyRepository) => new CreateValueTaxonomyUseCase(repo, PRODUCT_TAG_CONFIG),
      inject: [CATALOG_TOKENS.productTagRepository],
    },
    {
      provide: CATALOG_TOKENS.updateProductTagUseCase,
      useFactory: (repo: ValueTaxonomyRepository) => new UpdateValueTaxonomyUseCase(repo, PRODUCT_TAG_CONFIG),
      inject: [CATALOG_TOKENS.productTagRepository],
    },
    {
      provide: CATALOG_TOKENS.deleteProductTagUseCase,
      useFactory: (repo: ValueTaxonomyRepository) => new DeleteValueTaxonomyUseCase(repo, PRODUCT_TAG_CONFIG),
      inject: [CATALOG_TOKENS.productTagRepository],
    },
    {
      provide: CATALOG_TOKENS.listProductTagUseCase,
      useFactory: (repo: ValueTaxonomyRepository) => new ListValueTaxonomyUseCase(repo),
      inject: [CATALOG_TOKENS.productTagRepository],
    },
    {
      provide: CATALOG_TOKENS.getProductTagUseCase,
      useFactory: (repo: ValueTaxonomyRepository) => new GetValueTaxonomyUseCase(repo, PRODUCT_TAG_CONFIG),
      inject: [CATALOG_TOKENS.productTagRepository],
    },

    // ----- Tipos de producto (taxonomía de valor único) -----
    {
      provide: CATALOG_TOKENS.productTypeRepository,
      useFactory: (prisma: PrismaService) => new PrismaValueTaxonomyRepository(prisma, 'productType'),
      inject: [PrismaService],
    },
    {
      provide: CATALOG_TOKENS.createProductTypeUseCase,
      useFactory: (repo: ValueTaxonomyRepository) => new CreateValueTaxonomyUseCase(repo, PRODUCT_TYPE_CONFIG),
      inject: [CATALOG_TOKENS.productTypeRepository],
    },
    {
      provide: CATALOG_TOKENS.updateProductTypeUseCase,
      useFactory: (repo: ValueTaxonomyRepository) => new UpdateValueTaxonomyUseCase(repo, PRODUCT_TYPE_CONFIG),
      inject: [CATALOG_TOKENS.productTypeRepository],
    },
    {
      provide: CATALOG_TOKENS.deleteProductTypeUseCase,
      useFactory: (repo: ValueTaxonomyRepository) => new DeleteValueTaxonomyUseCase(repo, PRODUCT_TYPE_CONFIG),
      inject: [CATALOG_TOKENS.productTypeRepository],
    },
    {
      provide: CATALOG_TOKENS.listProductTypeUseCase,
      useFactory: (repo: ValueTaxonomyRepository) => new ListValueTaxonomyUseCase(repo),
      inject: [CATALOG_TOKENS.productTypeRepository],
    },
    {
      provide: CATALOG_TOKENS.getProductTypeUseCase,
      useFactory: (repo: ValueTaxonomyRepository) => new GetValueTaxonomyUseCase(repo, PRODUCT_TYPE_CONFIG),
      inject: [CATALOG_TOKENS.productTypeRepository],
    },

    // ----- Canales de venta -----
    { provide: CATALOG_TOKENS.salesChannelRepository, useClass: PrismaSalesChannelRepository },
    {
      provide: CreateSalesChannelUseCase,
      useFactory: (channels: SalesChannelRepository) => new CreateSalesChannelUseCase(channels),
      inject: [CATALOG_TOKENS.salesChannelRepository],
    },
    {
      provide: UpdateSalesChannelUseCase,
      useFactory: (channels: SalesChannelRepository) => new UpdateSalesChannelUseCase(channels),
      inject: [CATALOG_TOKENS.salesChannelRepository],
    },
    {
      provide: SetSalesChannelStatusUseCase,
      useFactory: (channels: SalesChannelRepository) => new SetSalesChannelStatusUseCase(channels),
      inject: [CATALOG_TOKENS.salesChannelRepository],
    },
    {
      provide: ListSalesChannelsUseCase,
      useFactory: (channels: SalesChannelRepository) => new ListSalesChannelsUseCase(channels),
      inject: [CATALOG_TOKENS.salesChannelRepository],
    },
    {
      provide: GetSalesChannelUseCase,
      useFactory: (channels: SalesChannelRepository) => new GetSalesChannelUseCase(channels),
      inject: [CATALOG_TOKENS.salesChannelRepository],
    },

    // ----- Colecciones -----
    { provide: CATALOG_TOKENS.productCollectionRepository, useClass: PrismaProductCollectionRepository },
    {
      provide: CreateCollectionUseCase,
      useFactory: (collections: ProductCollectionRepository) => new CreateCollectionUseCase(collections),
      inject: [CATALOG_TOKENS.productCollectionRepository],
    },
    {
      provide: UpdateCollectionUseCase,
      useFactory: (collections: ProductCollectionRepository) => new UpdateCollectionUseCase(collections),
      inject: [CATALOG_TOKENS.productCollectionRepository],
    },
    {
      provide: ListCollectionsUseCase,
      useFactory: (collections: ProductCollectionRepository) => new ListCollectionsUseCase(collections),
      inject: [CATALOG_TOKENS.productCollectionRepository],
    },
    {
      provide: GetCollectionUseCase,
      useFactory: (collections: ProductCollectionRepository) => new GetCollectionUseCase(collections),
      inject: [CATALOG_TOKENS.productCollectionRepository],
    },

    // ----- Categorías (árbol con materialized path) -----
    { provide: CATALOG_TOKENS.productCategoryRepository, useClass: PrismaProductCategoryRepository },
    {
      provide: CreateCategoryUseCase,
      useFactory: (categories: ProductCategoryRepository) => new CreateCategoryUseCase(categories),
      inject: [CATALOG_TOKENS.productCategoryRepository],
    },
    {
      provide: UpdateCategoryUseCase,
      useFactory: (categories: ProductCategoryRepository) => new UpdateCategoryUseCase(categories),
      inject: [CATALOG_TOKENS.productCategoryRepository],
    },
    {
      provide: MoveCategoryUseCase,
      useFactory: (categories: ProductCategoryRepository) => new MoveCategoryUseCase(categories),
      inject: [CATALOG_TOKENS.productCategoryRepository],
    },
    {
      provide: DeleteCategoryUseCase,
      useFactory: (categories: ProductCategoryRepository) => new DeleteCategoryUseCase(categories),
      inject: [CATALOG_TOKENS.productCategoryRepository],
    },
    {
      provide: ListCategoriesUseCase,
      useFactory: (categories: ProductCategoryRepository) => new ListCategoriesUseCase(categories),
      inject: [CATALOG_TOKENS.productCategoryRepository],
    },
    {
      provide: GetCategoryUseCase,
      useFactory: (categories: ProductCategoryRepository) => new GetCategoryUseCase(categories),
      inject: [CATALOG_TOKENS.productCategoryRepository],
    },

    // ----- Productos, opciones, variantes y especificaciones -----
    { provide: CATALOG_TOKENS.productRepository, useClass: PrismaProductRepository },
    {
      provide: CreateProductUseCase,
      useFactory: (products: ProductRepository) => new CreateProductUseCase(products),
      inject: [CATALOG_TOKENS.productRepository],
    },
    {
      provide: UpdateProductUseCase,
      useFactory: (products: ProductRepository) => new UpdateProductUseCase(products),
      inject: [CATALOG_TOKENS.productRepository],
    },
    {
      provide: DeleteProductUseCase,
      useFactory: (products: ProductRepository) => new DeleteProductUseCase(products),
      inject: [CATALOG_TOKENS.productRepository],
    },
    {
      provide: ListProductsUseCase,
      useFactory: (products: ProductRepository) => new ListProductsUseCase(products),
      inject: [CATALOG_TOKENS.productRepository],
    },
    {
      provide: GetProductUseCase,
      useFactory: (products: ProductRepository) => new GetProductUseCase(products),
      inject: [CATALOG_TOKENS.productRepository],
    },
    {
      provide: SetProductStatusUseCase,
      useFactory: (products: ProductRepository) => new SetProductStatusUseCase(products),
      inject: [CATALOG_TOKENS.productRepository],
    },
    {
      provide: AddProductOptionUseCase,
      useFactory: (products: ProductRepository) => new AddProductOptionUseCase(products),
      inject: [CATALOG_TOKENS.productRepository],
    },
    {
      provide: UpdateProductOptionUseCase,
      useFactory: (products: ProductRepository) => new UpdateProductOptionUseCase(products),
      inject: [CATALOG_TOKENS.productRepository],
    },
    {
      provide: RemoveProductOptionUseCase,
      useFactory: (products: ProductRepository) => new RemoveProductOptionUseCase(products),
      inject: [CATALOG_TOKENS.productRepository],
    },
    {
      provide: AddProductOptionValueUseCase,
      useFactory: (products: ProductRepository) => new AddProductOptionValueUseCase(products),
      inject: [CATALOG_TOKENS.productRepository],
    },
    {
      provide: RemoveProductOptionValueUseCase,
      useFactory: (products: ProductRepository) => new RemoveProductOptionValueUseCase(products),
      inject: [CATALOG_TOKENS.productRepository],
    },
    {
      provide: AddVariantUseCase,
      useFactory: (products: ProductRepository) => new AddVariantUseCase(products),
      inject: [CATALOG_TOKENS.productRepository],
    },
    {
      provide: UpdateVariantUseCase,
      useFactory: (products: ProductRepository) => new UpdateVariantUseCase(products),
      inject: [CATALOG_TOKENS.productRepository],
    },
    {
      provide: RemoveVariantUseCase,
      useFactory: (products: ProductRepository) => new RemoveVariantUseCase(products),
      inject: [CATALOG_TOKENS.productRepository],
    },
    {
      provide: PreviewVariantMatrixUseCase,
      useFactory: (products: ProductRepository) => new PreviewVariantMatrixUseCase(products),
      inject: [CATALOG_TOKENS.productRepository],
    },
    {
      provide: AddSpecificationUseCase,
      useFactory: (products: ProductRepository) => new AddSpecificationUseCase(products),
      inject: [CATALOG_TOKENS.productRepository],
    },
    {
      provide: UpdateSpecificationUseCase,
      useFactory: (products: ProductRepository) => new UpdateSpecificationUseCase(products),
      inject: [CATALOG_TOKENS.productRepository],
    },
    {
      provide: RemoveSpecificationUseCase,
      useFactory: (products: ProductRepository) => new RemoveSpecificationUseCase(products),
      inject: [CATALOG_TOKENS.productRepository],
    },
    {
      provide: SetVariantBasePriceUseCase,
      useFactory: (products: ProductRepository) => new SetVariantBasePriceUseCase(products),
      inject: [CATALOG_TOKENS.productRepository],
    },
    {
      provide: AddVariantTierPriceUseCase,
      useFactory: (products: ProductRepository) => new AddVariantTierPriceUseCase(products),
      inject: [CATALOG_TOKENS.productRepository],
    },
    {
      provide: UpdateVariantTierPriceUseCase,
      useFactory: (products: ProductRepository) => new UpdateVariantTierPriceUseCase(products),
      inject: [CATALOG_TOKENS.productRepository],
    },
    {
      provide: RemoveVariantTierPriceUseCase,
      useFactory: (products: ProductRepository) => new RemoveVariantTierPriceUseCase(products),
      inject: [CATALOG_TOKENS.productRepository],
    },

    // ----- Listas de precios -----
    { provide: CATALOG_TOKENS.priceListRepository, useClass: PrismaPriceListRepository },
    {
      provide: CreatePriceListUseCase,
      useFactory: (priceLists: PriceListRepository) => new CreatePriceListUseCase(priceLists),
      inject: [CATALOG_TOKENS.priceListRepository],
    },
    {
      provide: UpdatePriceListUseCase,
      useFactory: (priceLists: PriceListRepository) => new UpdatePriceListUseCase(priceLists),
      inject: [CATALOG_TOKENS.priceListRepository],
    },
    {
      provide: SetPriceListStatusUseCase,
      useFactory: (priceLists: PriceListRepository) => new SetPriceListStatusUseCase(priceLists),
      inject: [CATALOG_TOKENS.priceListRepository],
    },
    {
      provide: ListPriceListsUseCase,
      useFactory: (priceLists: PriceListRepository) => new ListPriceListsUseCase(priceLists),
      inject: [CATALOG_TOKENS.priceListRepository],
    },
    {
      provide: GetPriceListUseCase,
      useFactory: (priceLists: PriceListRepository) => new GetPriceListUseCase(priceLists),
      inject: [CATALOG_TOKENS.priceListRepository],
    },
    {
      provide: DeletePriceListUseCase,
      useFactory: (priceLists: PriceListRepository) => new DeletePriceListUseCase(priceLists),
      inject: [CATALOG_TOKENS.priceListRepository],
    },
    {
      provide: AddPriceListPriceUseCase,
      useFactory: (priceLists: PriceListRepository, products: ProductRepository) => new AddPriceListPriceUseCase(priceLists, products),
      inject: [CATALOG_TOKENS.priceListRepository, CATALOG_TOKENS.productRepository],
    },
    {
      provide: UpdatePriceListPriceUseCase,
      useFactory: (priceLists: PriceListRepository) => new UpdatePriceListPriceUseCase(priceLists),
      inject: [CATALOG_TOKENS.priceListRepository],
    },
    {
      provide: RemovePriceListPriceUseCase,
      useFactory: (priceLists: PriceListRepository) => new RemovePriceListPriceUseCase(priceLists),
      inject: [CATALOG_TOKENS.priceListRepository],
    },
    {
      provide: GetEffectivePriceUseCase,
      useFactory: (products: ProductRepository, priceLists: PriceListRepository) => new GetEffectivePriceUseCase(products, priceLists),
      inject: [CATALOG_TOKENS.productRepository, CATALOG_TOKENS.priceListRepository],
    },
  ],
  exports: [
    CATALOG_TOKENS.brandRepository,
    CATALOG_TOKENS.productTagRepository,
    CATALOG_TOKENS.productTypeRepository,
    CATALOG_TOKENS.salesChannelRepository,
    CATALOG_TOKENS.productCollectionRepository,
    CATALOG_TOKENS.productCategoryRepository,
    CATALOG_TOKENS.productRepository,
    CATALOG_TOKENS.priceListRepository,
  ],
})
export class CatalogModule {}
