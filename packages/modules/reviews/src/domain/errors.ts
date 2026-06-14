export class ReviewNotFoundError extends Error {
  constructor() {
    super('La review no existe o no pertenece a esta tienda');
  }
}

export class ReviewValidationError extends Error {}

export class VerifiedPurchaseRequiredError extends Error {
  constructor() {
    super('Solo clientes con compra verificada pueden dejar una review');
  }
}

export class DuplicateReviewError extends Error {
  constructor() {
    super('El cliente ya dejó una review para este producto');
  }
}

export class ReviewNotEditableError extends Error {
  constructor() {
    super('Solo las reviews pendientes se pueden editar');
  }
}
