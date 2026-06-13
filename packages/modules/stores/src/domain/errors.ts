import { DomainError, NotFoundError } from '@mitama/core';

export class StoreCodeAlreadyInUseError extends DomainError {
  readonly code = 'STORES.CODE_ALREADY_IN_USE';

  constructor(storeCode: string) {
    super(`El código de tienda "${storeCode}" ya está en uso`);
  }
}

export class InvalidCurrencyError extends DomainError {
  readonly code = 'STORES.INVALID_CURRENCY';

  constructor(currencyCode: string) {
    super(`La moneda "${currencyCode}" no existe`);
  }
}

export class InvalidRegionError extends DomainError {
  readonly code = 'STORES.INVALID_REGION';

  constructor(regionId: string) {
    super(`La región "${regionId}" no existe`);
  }
}

export class StoreNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Tienda', id);
  }
}
