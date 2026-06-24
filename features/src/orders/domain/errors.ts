export class OrderNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró la orden ${id}`);
  }
}

export class CheckoutCartNotReadyError extends Error {
  constructor() {
    super('El carrito no está listo para confirmar');
  }
}

export class InsufficientStockError extends Error {
  constructor() {
    super('Stock insuficiente');
  }
}

export class IdempotencyConflictError extends Error {
  constructor() {
    super('La Idempotency-Key ya fue usada con un payload distinto');
  }
}

export class OrderAlreadyExistsForCartError extends Error {
  constructor() {
    super('El carrito ya tiene una orden asociada');
  }
}

export class InvalidOrderStateTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Transición de orden inválida: ${from} → ${to}`);
  }
}

export class InvalidPaymentStateTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Transición de pago inválida: ${from} → ${to}`);
  }
}

export class CompletedOrderCannotBeCancelledError extends Error {
  constructor() {
    super('No se puede cancelar una orden completada');
  }
}

/**
 * El método de envío elegido por el comprador dejó de ser elegible al
 * recalcular server-side (zona no cubierta, método deshabilitado o
 * inexistente). El checkout debe rechazarse para que se re-elija método;
 * no se sustituye por un default (r13 · sprint1_cierre).
 */
export class ShippingMethodNotEligibleError extends Error {
  constructor(reason: string) {
    super(`El método de envío no es elegible: ${reason}`);
  }
}
