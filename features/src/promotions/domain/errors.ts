export class PromotionValidationError extends Error {}

export class DiscountNotFoundError extends Error {
  constructor(id: string) {
    super(`El descuento ${id} no existe`);
  }
}

export class CouponNotFoundError extends Error {
  constructor() {
    super('El cupón no existe o no pertenece a esta tienda');
  }
}

export class CouponNotApplicableError extends Error {}

export class TooManyCouponsError extends Error {
  constructor() {
    super('Solo se acepta un cupón por orden');
  }
}

export class RewardProgramNotConfiguredError extends Error {
  constructor() {
    super('El programa de puntos no está configurado para esta tienda');
  }
}

export class NewsletterSubscriptionNotFoundError extends Error {
  constructor() {
    super('La suscripción al newsletter no existe');
  }
}
