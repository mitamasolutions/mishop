import { Currency } from '../domain/currency.entity';
import type { CurrencyRepository } from '../domain/currency.repository';

export class InMemoryCurrencyRepository implements CurrencyRepository {
  constructor(private readonly currencies: Currency[] = []) {}

  async findAll(): Promise<Currency[]> {
    return [...this.currencies];
  }

  async findByCode(code: string): Promise<Currency | null> {
    return this.currencies.find((currency) => currency.code === code) ?? null;
  }
}
