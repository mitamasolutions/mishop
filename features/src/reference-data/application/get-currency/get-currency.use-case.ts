import { err, NotFoundError, ok, Result, UseCase } from '@mitama/core';
import type { CurrencyRepository } from '../../domain/currency.repository';
import type { CurrencyOutput } from '../list-currencies/list-currencies.dto';

export class GetCurrencyUseCase implements UseCase<string, Result<CurrencyOutput, NotFoundError>> {
  constructor(private readonly currencies: CurrencyRepository) {}

  async execute(code: string): Promise<Result<CurrencyOutput, NotFoundError>> {
    const currency = await this.currencies.findByCode(code);
    if (!currency) {
      return err(new NotFoundError('La moneda', code));
    }
    return ok({
      code: currency.code,
      symbol: currency.symbol,
      symbolNative: currency.symbolNative,
      decimalDigits: currency.decimalDigits,
      rounding: currency.rounding,
      name: currency.name,
    });
  }
}
