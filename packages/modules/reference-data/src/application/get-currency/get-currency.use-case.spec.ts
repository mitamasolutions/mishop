import { describe, expect, it } from 'vitest';
import { NotFoundError } from '@mitama/core';
import { Currency } from '../../domain/currency.entity';
import { InMemoryCurrencyRepository } from '../../infra/in-memory-currency.repository';
import { GetCurrencyUseCase } from './get-currency.use-case';

describe('GetCurrencyUseCase', () => {
  it('devuelve la moneda por código', async () => {
    const mxn = Currency.rehydrate('MXN', {
      symbol: '$',
      symbolNative: '$',
      decimalDigits: 2,
      rounding: 0,
      name: 'Peso mexicano',
    });
    const useCase = new GetCurrencyUseCase(new InMemoryCurrencyRepository([mxn]));

    const result = await useCase.execute('MXN');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.name).toBe('Peso mexicano');
    }
  });

  it('falla con NotFoundError si el código no existe', async () => {
    const useCase = new GetCurrencyUseCase(new InMemoryCurrencyRepository([]));

    const result = await useCase.execute('XXX');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(NotFoundError);
    }
  });
});
