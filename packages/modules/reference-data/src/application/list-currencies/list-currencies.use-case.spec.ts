import { describe, expect, it } from 'vitest';
import { Currency } from '../../domain/currency.entity';
import { InMemoryCurrencyRepository } from '../../infra/in-memory-currency.repository';
import { ListCurrenciesUseCase } from './list-currencies.use-case';

describe('ListCurrenciesUseCase', () => {
  it('lista las monedas disponibles', async () => {
    const mxn = Currency.rehydrate('MXN', {
      symbol: '$',
      symbolNative: '$',
      decimalDigits: 2,
      rounding: 0,
      name: 'Peso mexicano',
    });
    const useCase = new ListCurrenciesUseCase(new InMemoryCurrencyRepository([mxn]));

    const result = await useCase.execute();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual([
        { code: 'MXN', symbol: '$', symbolNative: '$', decimalDigits: 2, rounding: 0, name: 'Peso mexicano' },
      ]);
    }
  });
});
