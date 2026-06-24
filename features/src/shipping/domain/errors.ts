export class ShippingMethodNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró el método de envío ${id}`);
  }
}

export class ShipmentNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró el envío ${id}`);
  }
}

export class InvalidShipmentTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Transición de envío inválida: ${from} -> ${to}`);
  }
}
