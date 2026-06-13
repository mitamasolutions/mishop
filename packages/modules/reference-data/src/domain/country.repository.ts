import { Country } from './country.entity';

/** Puerto de solo lectura: los países se cargan por seed, sin CRUD por API. */
export interface CountryRepository {
  findAll(): Promise<Country[]>;
  findByIso2(iso2: string): Promise<Country | null>;
}
