import { DomainError, NotFoundError } from '@mitama/core';

export class StockLocationNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Ubicación de stock', id);
  }
}

export class InventoryItemNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Ítem de inventario', id);
  }
}

export class InventoryItemSkuAlreadyInUseError extends DomainError {
  readonly code = 'INVENTORY.SKU_ALREADY_IN_USE';

  constructor(sku: string) {
    super(`El SKU "${sku}" ya está en uso`);
  }
}

export class VariantAlreadyLinkedError extends DomainError {
  readonly code = 'INVENTORY.VARIANT_ALREADY_LINKED';

  constructor(variantId: string) {
    super(`La variante "${variantId}" ya tiene un ítem de inventario asociado`);
  }
}

export class InventoryLevelNotFoundError extends NotFoundError {
  constructor(locationId: string) {
    super('Nivel de inventario', locationId);
  }
}

export class InvalidQuantityError extends DomainError {
  readonly code = 'INVENTORY.INVALID_QUANTITY';

  constructor() {
    super('La cantidad debe ser mayor o igual a 0');
  }
}
