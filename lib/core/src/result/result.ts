/**
 * Result<T, E>: representa el resultado de una operación que puede fallar,
 * sin lanzar excepciones. Los casos de uso siempre retornan Result.
 */
export class Ok<T, E> {
  readonly kind = 'ok' as const;

  constructor(readonly value: T) {}

  isOk(): this is Ok<T, E> {
    return true;
  }

  isErr(): this is Err<T, E> {
    return false;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return ok(fn(this.value));
  }

  mapErr<F>(_fn: (error: E) => F): Result<T, F> {
    return ok(this.value);
  }

  unwrapOr(_fallback: T): T {
    return this.value;
  }
}

export class Err<T, E> {
  readonly kind = 'err' as const;

  constructor(readonly error: E) {}

  isOk(): this is Ok<T, E> {
    return false;
  }

  isErr(): this is Err<T, E> {
    return true;
  }

  map<U>(_fn: (value: T) => U): Result<U, E> {
    return err(this.error);
  }

  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return err(fn(this.error));
  }

  unwrapOr(fallback: T): T {
    return fallback;
  }
}

export type Result<T, E> = Ok<T, E> | Err<T, E>;

export function ok<T, E = never>(value: T): Result<T, E> {
  return new Ok(value);
}

export function err<E, T = never>(error: E): Result<T, E> {
  return new Err(error);
}
