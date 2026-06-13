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
