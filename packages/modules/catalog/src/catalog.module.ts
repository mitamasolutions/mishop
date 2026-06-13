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
  ],
  exports: [
    CATALOG_TOKENS.brandRepository,
    CATALOG_TOKENS.productTagRepository,
    CATALOG_TOKENS.productTypeRepository,
    CATALOG_TOKENS.salesChannelRepository,
    CATALOG_TOKENS.productCollectionRepository,
  ],
})
export class CatalogModule {}
