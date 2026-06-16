import { DomainError, NotFoundError } from '@mitama/core';

export class BrandHandleAlreadyInUseError extends DomainError {
  readonly code = 'CATALOG.BRAND_HANDLE_ALREADY_IN_USE';

  constructor(handle: string) {
    super(`El slug de marca "${handle}" ya está en uso`);
  }
}

export class BrandNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Marca', id);
  }
}

/** Error genérico para taxonomías de valor único (tipos, etiquetas). */
export class ValueAlreadyInUseError extends DomainError {
  readonly code: string;

  constructor(entityCode: string, entityLabel: string, value: string) {
    super(`${entityLabel} "${value}" ya existe`);
    this.code = `CATALOG.${entityCode}_ALREADY_IN_USE`;
  }
}

export class ValueTaxonomyNotFoundError extends NotFoundError {
  constructor(entityLabel: string, id: string) {
    super(entityLabel, id);
  }
}

export class SalesChannelNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Canal de venta', id);
  }
}

export class CollectionHandleAlreadyInUseError extends DomainError {
  readonly code = 'CATALOG.COLLECTION_HANDLE_ALREADY_IN_USE';

  constructor(handle: string) {
    super(`El slug de colección "${handle}" ya está en uso`);
  }
}

export class CollectionNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Colección', id);
  }
}

export class CategoryHandleAlreadyInUseError extends DomainError {
  readonly code = 'CATALOG.CATEGORY_HANDLE_ALREADY_IN_USE';

  constructor(handle: string) {
    super(`El slug de categoría "${handle}" ya está en uso`);
  }
}

export class ProductCategoryNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Categoría', id);
  }
}

export class CategoryInvalidParentError extends DomainError {
  readonly code = 'CATALOG.CATEGORY_INVALID_PARENT';

  constructor(message: string) {
    super(message);
  }
}

export class ProductHandleAlreadyInUseError extends DomainError {
  readonly code = 'CATALOG.PRODUCT_HANDLE_ALREADY_IN_USE';

  constructor(handle: string) {
    super(`El slug de producto "${handle}" ya está en uso`);
  }
}

export class ProductNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Producto', id);
  }
}

export class ProductOptionNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Opción de producto', id);
  }
}

export class ProductOptionValueNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Valor de opción', id);
  }
}

export class ProductVariantNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Variante', id);
  }
}

export class VariantSkuAlreadyInUseError extends DomainError {
  readonly code = 'CATALOG.VARIANT_SKU_ALREADY_IN_USE';

  constructor(sku: string) {
    super(`El SKU "${sku}" ya está en uso`);
  }
}

export class InvalidVariantCombinationError extends DomainError {
  readonly code = 'CATALOG.INVALID_VARIANT_COMBINATION';

  constructor(message: string) {
    super(message);
  }
}

export class LastVariantCannotBeRemovedError extends DomainError {
  readonly code = 'CATALOG.LAST_VARIANT_CANNOT_BE_REMOVED';

  constructor() {
    super('Un producto debe tener al menos una variante');
  }
}

export class ProductSpecificationNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Especificación', id);
  }
}

export class InvalidTierPriceRangeError extends DomainError {
  readonly code = 'CATALOG.INVALID_TIER_PRICE_RANGE';

  constructor() {
    super('La cantidad mínima debe ser mayor o igual a 1 y la máxima (si existe) debe ser mayor o igual a la mínima');
  }
}

export class VariantPriceNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Precio de variante', id);
  }
}

export class PriceListNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Lista de precios', id);
  }
}

export class PriceListPriceNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Precio de lista', id);
  }
}

export class InvalidDateRangeError extends DomainError {
  readonly code = 'CATALOG.INVALID_DATE_RANGE';

  constructor() {
    super('La fecha de fin no puede ser anterior a la de inicio');
  }
}

export class NoPriceConfiguredError extends DomainError {
  readonly code = 'CATALOG.NO_PRICE_CONFIGURED';

  constructor(currencyCode: string) {
    super(`No hay un precio configurado para esta variante en ${currencyCode}`);
  }
}
