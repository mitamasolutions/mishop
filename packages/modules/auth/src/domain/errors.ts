import { DomainError } from '@mitama/core';

export class EmailAlreadyInUseError extends DomainError {
  readonly code = 'AUTH.EMAIL_ALREADY_IN_USE';

  constructor(email: string) {
    super(`El email "${email}" ya está registrado`);
  }
}
