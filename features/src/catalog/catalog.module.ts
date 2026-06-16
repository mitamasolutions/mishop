/**
 * Composición del módulo catalog: el único lugar donde las capas se conectan
 * (puertos → adapters). Sin lógica de negocio aquí.
 */
import { Module } from '@nestjs/common';
import { createModuleProviders } from '@mitama/contracts';
import { PrismaService } from '@mitama/db';
import { CATALOG_TOKENS } from './catalog.tokens';
import { CreateBrandUseCase } from './application/create-brand/create-brand.use-case';
import { UpdateBrandUseCase } from './application/update-brand/update-brand.use-case';
import { SetBrandStatusUseCase } from './application/set-brand-status/set-brand-status.use-case';
import { ListBrandsUseCase } from './application/list-brands/list-brands.use-case';
import { GetBrandUseCase } from './application/get-brand/get-brand.use-case';
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
import { PrismaValueTaxonomyRepository } from './infra/prisma-value-taxonomy.repository';
import { ProductTagsController } from './http/product-tags.controller';
import { ProductTypesController } from './http/product-types.controller';

import { CreateSalesChannelUseCase } from './application/create-sales-channel/create-sales-channel.use-case';
import { UpdateSalesChannelUseCase } from './application/update-sales-channel/update-sales-channel.use-case';
import { SetSalesChannelStatusUseCase } from './application/set-sales-channel-status/set-sales-channel-status.use-case';
import { ListSalesChannelsUseCase } from './application/list-sales-channels/list-sales-channels.use-case';
import { GetSalesChannelUseCase } from './application/get-sales-channel/get-sales-channel.use-case';
import { PrismaSalesChannelRepository } from './infra/prisma-sales-channel.repository';
import { SalesChannelsController } from './http/sales-channels.controller';

import { CreateCollectionUseCase } from './application/create-collection/create-collection.use-case';
import { UpdateCollectionUseCase } from './application/update-collection/update-collection.use-case';
import { ListCollectionsUseCase } from './application/list-collections/list-collections.use-case';
import { GetCollectionUseCase } from './application/get-collection/get-collection.use-case';
import { PrismaProductCollectionRepository } from './infra/prisma-product-collection.repository';
import { CollectionsController } from './http/collections.controller';

import { CreateCategoryUseCase } from './application/create-category/create-category.use-case';
import { UpdateCategoryUseCase } from './application/update-category/update-category.use-case';
import { MoveCategoryUseCase } from './application/move-category/move-category.use-case';
import { DeleteCategoryUseCase } from './application/delete-category/delete-category.use-case';
import { ListCategoriesUseCase } from './application/list-categories/list-categories.use-case';
import { GetCategoryUseCase } from './application/get-category/get-category.use-case';
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
  providers: createModuleProviders([
    { provide: CATALOG_TOKENS.brandRepository, useClass: PrismaBrandRepository },
    { useCase: CreateBrandUseCase, inject: [CATALOG_TOKENS.brandRepository] },
    { useCase: UpdateBrandUseCase, inject: [CATALOG_TOKENS.brandRepository] },
    { useCase: SetBrandStatusUseCase, inject: [CATALOG_TOKENS.brandRepository] },
    { useCase: ListBrandsUseCase, inject: [CATALOG_TOKENS.brandRepository] },
    { useCase: GetBrandUseCase, inject: [CATALOG_TOKENS.brandRepository] },

    { provide: CATALOG_TOKENS.productTagRepository, factory: (prisma: PrismaService) => new PrismaValueTaxonomyRepository(prisma, 'productTag'), inject: [PrismaService] },
    { provide: CATALOG_TOKENS.createProductTagUseCase, factory: (repo) => new CreateValueTaxonomyUseCase(repo, PRODUCT_TAG_CONFIG), inject: [CATALOG_TOKENS.productTagRepository] },
    { provide: CATALOG_TOKENS.updateProductTagUseCase, factory: (repo) => new UpdateValueTaxonomyUseCase(repo, PRODUCT_TAG_CONFIG), inject: [CATALOG_TOKENS.productTagRepository] },
    { provide: CATALOG_TOKENS.deleteProductTagUseCase, factory: (repo) => new DeleteValueTaxonomyUseCase(repo, PRODUCT_TAG_CONFIG), inject: [CATALOG_TOKENS.productTagRepository] },
    { provide: CATALOG_TOKENS.listProductTagUseCase, factory: (repo) => new ListValueTaxonomyUseCase(repo), inject: [CATALOG_TOKENS.productTagRepository] },
    { provide: CATALOG_TOKENS.getProductTagUseCase, factory: (repo) => new GetValueTaxonomyUseCase(repo, PRODUCT_TAG_CONFIG), inject: [CATALOG_TOKENS.productTagRepository] },

    { provide: CATALOG_TOKENS.productTypeRepository, factory: (prisma: PrismaService) => new PrismaValueTaxonomyRepository(prisma, 'productType'), inject: [PrismaService] },
    { provide: CATALOG_TOKENS.createProductTypeUseCase, factory: (repo) => new CreateValueTaxonomyUseCase(repo, PRODUCT_TYPE_CONFIG), inject: [CATALOG_TOKENS.productTypeRepository] },
    { provide: CATALOG_TOKENS.updateProductTypeUseCase, factory: (repo) => new UpdateValueTaxonomyUseCase(repo, PRODUCT_TYPE_CONFIG), inject: [CATALOG_TOKENS.productTypeRepository] },
    { provide: CATALOG_TOKENS.deleteProductTypeUseCase, factory: (repo) => new DeleteValueTaxonomyUseCase(repo, PRODUCT_TYPE_CONFIG), inject: [CATALOG_TOKENS.productTypeRepository] },
    { provide: CATALOG_TOKENS.listProductTypeUseCase, factory: (repo) => new ListValueTaxonomyUseCase(repo), inject: [CATALOG_TOKENS.productTypeRepository] },
    { provide: CATALOG_TOKENS.getProductTypeUseCase, factory: (repo) => new GetValueTaxonomyUseCase(repo, PRODUCT_TYPE_CONFIG), inject: [CATALOG_TOKENS.productTypeRepository] },

    { provide: CATALOG_TOKENS.salesChannelRepository, useClass: PrismaSalesChannelRepository },
    { useCase: CreateSalesChannelUseCase, inject: [CATALOG_TOKENS.salesChannelRepository] },
    { useCase: UpdateSalesChannelUseCase, inject: [CATALOG_TOKENS.salesChannelRepository] },
    { useCase: SetSalesChannelStatusUseCase, inject: [CATALOG_TOKENS.salesChannelRepository] },
    { useCase: ListSalesChannelsUseCase, inject: [CATALOG_TOKENS.salesChannelRepository] },
    { useCase: GetSalesChannelUseCase, inject: [CATALOG_TOKENS.salesChannelRepository] },

    { provide: CATALOG_TOKENS.productCollectionRepository, useClass: PrismaProductCollectionRepository },
    { useCase: CreateCollectionUseCase, inject: [CATALOG_TOKENS.productCollectionRepository] },
    { useCase: UpdateCollectionUseCase, inject: [CATALOG_TOKENS.productCollectionRepository] },
    { useCase: ListCollectionsUseCase, inject: [CATALOG_TOKENS.productCollectionRepository] },
    { useCase: GetCollectionUseCase, inject: [CATALOG_TOKENS.productCollectionRepository] },

    { provide: CATALOG_TOKENS.productCategoryRepository, useClass: PrismaProductCategoryRepository },
    { useCase: CreateCategoryUseCase, inject: [CATALOG_TOKENS.productCategoryRepository] },
    { useCase: UpdateCategoryUseCase, inject: [CATALOG_TOKENS.productCategoryRepository] },
    { useCase: MoveCategoryUseCase, inject: [CATALOG_TOKENS.productCategoryRepository] },
    { useCase: DeleteCategoryUseCase, inject: [CATALOG_TOKENS.productCategoryRepository] },
    { useCase: ListCategoriesUseCase, inject: [CATALOG_TOKENS.productCategoryRepository] },
    { useCase: GetCategoryUseCase, inject: [CATALOG_TOKENS.productCategoryRepository] },

    { provide: CATALOG_TOKENS.productRepository, useClass: PrismaProductRepository },
    { useCase: CreateProductUseCase, inject: [CATALOG_TOKENS.productRepository] },
    { useCase: UpdateProductUseCase, inject: [CATALOG_TOKENS.productRepository] },
    { useCase: DeleteProductUseCase, inject: [CATALOG_TOKENS.productRepository] },
    { useCase: ListProductsUseCase, inject: [CATALOG_TOKENS.productRepository] },
    { useCase: GetProductUseCase, inject: [CATALOG_TOKENS.productRepository] },
    { useCase: SetProductStatusUseCase, inject: [CATALOG_TOKENS.productRepository] },
    { useCase: AddProductOptionUseCase, inject: [CATALOG_TOKENS.productRepository] },
    { useCase: UpdateProductOptionUseCase, inject: [CATALOG_TOKENS.productRepository] },
    { useCase: RemoveProductOptionUseCase, inject: [CATALOG_TOKENS.productRepository] },
    { useCase: AddProductOptionValueUseCase, inject: [CATALOG_TOKENS.productRepository] },
    { useCase: RemoveProductOptionValueUseCase, inject: [CATALOG_TOKENS.productRepository] },
    { useCase: AddVariantUseCase, inject: [CATALOG_TOKENS.productRepository] },
    { useCase: UpdateVariantUseCase, inject: [CATALOG_TOKENS.productRepository] },
    { useCase: RemoveVariantUseCase, inject: [CATALOG_TOKENS.productRepository] },
    { useCase: PreviewVariantMatrixUseCase, inject: [CATALOG_TOKENS.productRepository] },
    { useCase: AddSpecificationUseCase, inject: [CATALOG_TOKENS.productRepository] },
    { useCase: UpdateSpecificationUseCase, inject: [CATALOG_TOKENS.productRepository] },
    { useCase: RemoveSpecificationUseCase, inject: [CATALOG_TOKENS.productRepository] },
    { useCase: SetVariantBasePriceUseCase, inject: [CATALOG_TOKENS.productRepository] },
    { useCase: AddVariantTierPriceUseCase, inject: [CATALOG_TOKENS.productRepository] },
    { useCase: UpdateVariantTierPriceUseCase, inject: [CATALOG_TOKENS.productRepository] },
    { useCase: RemoveVariantTierPriceUseCase, inject: [CATALOG_TOKENS.productRepository] },

    { provide: CATALOG_TOKENS.priceListRepository, useClass: PrismaPriceListRepository },
    { useCase: CreatePriceListUseCase, inject: [CATALOG_TOKENS.priceListRepository] },
    { useCase: UpdatePriceListUseCase, inject: [CATALOG_TOKENS.priceListRepository] },
    { useCase: SetPriceListStatusUseCase, inject: [CATALOG_TOKENS.priceListRepository] },
    { useCase: ListPriceListsUseCase, inject: [CATALOG_TOKENS.priceListRepository] },
    { useCase: GetPriceListUseCase, inject: [CATALOG_TOKENS.priceListRepository] },
    { useCase: DeletePriceListUseCase, inject: [CATALOG_TOKENS.priceListRepository] },
    { useCase: AddPriceListPriceUseCase, inject: [CATALOG_TOKENS.priceListRepository, CATALOG_TOKENS.productRepository] },
    { useCase: UpdatePriceListPriceUseCase, inject: [CATALOG_TOKENS.priceListRepository] },
    { useCase: RemovePriceListPriceUseCase, inject: [CATALOG_TOKENS.priceListRepository] },
    { useCase: GetEffectivePriceUseCase, inject: [CATALOG_TOKENS.productRepository, CATALOG_TOKENS.priceListRepository] },
  ]),
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
