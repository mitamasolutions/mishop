import { Currency } from './currency.entity';

/** Puerto de solo lectura: las monedas se cargan por seed, sin CRUD por API. */
export interface CurrencyRepository {
  findAll(): Promise<Currency[]>;
  findByCode(code: string): Promise<Currency | null>;
}
