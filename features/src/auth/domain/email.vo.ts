import { err, ok, Result, ValidationError, ValueObject } from '@mitama/core';

interface EmailProps {
  value: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email extends ValueObject<EmailProps> {
  static create(raw: string): Result<Email, ValidationError> {
    const value = raw.trim().toLowerCase();
    if (!EMAIL_REGEX.test(value)) {
      return err(new ValidationError(`"${raw}" no es un email válido`));
    }
    return ok(new Email({ value }));
  }

  get value(): string {
    return this.props.value;
  }
}
