import { describe, expect, it } from 'vitest';
import { err, ok } from './result';
import { ValidationError } from './errors';

describe('Result', () => {
  it('ok expone el valor y permite map', () => {
    const result = ok(2).map((n) => n * 2);

    expect(result.isOk()).toBe(true);
    expect(result.unwrapOr(0)).toBe(4);
  });

  it('err expone el error y no ejecuta map', () => {
    const result = err<ValidationError, number>(new ValidationError('inválido')).map(
      (n) => n * 2,
    );

    expect(result.isErr()).toBe(true);
    expect(result.unwrapOr(0)).toBe(0);
    if (result.isErr()) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });
});
