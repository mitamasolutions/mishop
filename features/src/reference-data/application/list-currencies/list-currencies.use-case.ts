import { ok, Result, UseCase } from '@mitama/core';
import type { CurrencyRepository } from '../../domain/currency.repository';
import type { CurrencyOutput } from './list-currencies.dto';

export class ListCurrenciesUseCase implements UseCase<void, Result<CurrencyOutput[], never>> {
  constructor(private readonly currencies: CurrencyRepository) {}

  async execute(): Promise<Result<CurrencyOutput[], never>> {
    const all = await this.currencies.findAll();
    return ok(
      all.map((currency) => ({
        code: currency.code,
        symbol: currency.symbol,
        symbolNative: currency.symbolNative,
        decimalDigits: currency.decimalDigits,
        rounding: currency.rounding,
        name: currency.name,
      })),
    );
  }
}
