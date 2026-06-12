/**
 * Jerarquía base de errores de dominio. Cada módulo define sus errores
 * extendiendo DomainError (o una de sus especializaciones) con un `code` propio.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  readonly code: string = 'VALIDATION_ERROR';
}

export class NotFoundError extends DomainError {
  readonly code: string = 'NOT_FOUND';

  constructor(resource: string, id?: string) {
    super(id ? `${resource} con id "${id}" no existe` : `${resource} no existe`);
  }
}
