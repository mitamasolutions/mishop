/** Tokens de inyección internos del módulo: puertos → adapters y casos de uso genéricos. */
export const CATALOG_TOKENS = {
  brandRepository: 'catalog.brand-repository',
  productTagRepository: 'catalog.product-tag-repository',
  productTypeRepository: 'catalog.product-type-repository',
  salesChannelRepository: 'catalog.sales-channel-repository',
  productCollectionRepository: 'catalog.product-collection-repository',

  createProductTagUseCase: 'catalog.create-product-tag-use-case',
  updateProductTagUseCase: 'catalog.update-product-tag-use-case',
  deleteProductTagUseCase: 'catalog.delete-product-tag-use-case',
  listProductTagUseCase: 'catalog.list-product-tag-use-case',
  getProductTagUseCase: 'catalog.get-product-tag-use-case',

  createProductTypeUseCase: 'catalog.create-product-type-use-case',
  updateProductTypeUseCase: 'catalog.update-product-type-use-case',
  deleteProductTypeUseCase: 'catalog.delete-product-type-use-case',
  listProductTypeUseCase: 'catalog.list-product-type-use-case',
  getProductTypeUseCase: 'catalog.get-product-type-use-case',
} as const;
