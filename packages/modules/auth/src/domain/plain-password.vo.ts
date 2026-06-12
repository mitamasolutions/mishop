import { err, ok, Result, ValidationError, ValueObject } from '@mitama/core';

interface PlainPasswordProps {
  value: string;
}

const MIN_LENGTH = 8;

/** Contraseña en texto plano, validada pero aún sin hashear. */
export class PlainPassword extends ValueObject<PlainPasswordProps> {
  static create(raw: string): Result<PlainPassword, ValidationError> {
    if (raw.length < MIN_LENGTH) {
      return err(
        new ValidationError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres`),
      );
    }
    return ok(new PlainPassword({ value: raw }));
  }

  get value(): string {
    return this.props.value;
  }
}
