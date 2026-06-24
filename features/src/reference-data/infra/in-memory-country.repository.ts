import { Country } from '../domain/country.entity';
import type { CountryRepository } from '../domain/country.repository';

export class InMemoryCountryRepository implements CountryRepository {
  constructor(private readonly countries: Country[] = []) {}

  async findAll(): Promise<Country[]> {
    return [...this.countries];
  }

  async findByIso2(iso2: string): Promise<Country | null> {
    return this.countries.find((country) => country.iso2 === iso2) ?? null;
  }
}
