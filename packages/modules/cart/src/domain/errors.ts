export class CartNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró el carrito ${id}`);
  }
}

export class CartStoreChannelMismatchError extends Error {
  constructor() {
    super('El carrito pertenece a otra tienda o canal');
  }
}

export class CartLineNotFoundError extends Error {
  constructor(lineId: string) {
    super(`No se encontró la línea ${lineId}`);
  }
}

export class CartHasUnconfirmedPriceChangesError extends Error {
  constructor() {
    super('Hay cambios de precio pendientes de confirmar');
  }
}

export class CartHasInvalidStockError extends Error {
  constructor() {
    super('El carrito tiene líneas sin stock suficiente');
  }
}

export class InvalidCheckoutStepError extends Error {
  constructor() {
    super('No se puede avanzar a esa etapa del checkout');
  }
}
