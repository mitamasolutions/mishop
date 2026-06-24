export class GiftCardValidationError extends Error {}

export class GiftCardNotFoundError extends Error {
  constructor() {
    super('La gift card no existe o no pertenece a esta tienda');
  }
}

export class GiftCardNotRedeemableError extends Error {}

export class GiftCardCurrencyMismatchError extends Error {
  constructor() {
    super('La moneda de la gift card no coincide con la moneda de la orden');
  }
}
