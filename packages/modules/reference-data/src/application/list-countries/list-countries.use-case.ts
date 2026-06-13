import { ok, Result, UseCase } from '@mitama/core';
import type { CountryRepository } from '../../domain/country.repository';
import type { CountryOutput } from './list-countries.dto';

export class ListCountriesUseCase implements UseCase<void, Result<CountryOutput[], never>> {
  constructor(private readonly countries: CountryRepository) {}

  async execute(): Promise<Result<CountryOutput[], never>> {
    const all = await this.countries.findAll();
    return ok(
      all.map((country) => ({
        iso2: country.iso2,
        iso3: country.iso3,
        numCode: country.numCode,
        name: country.name,
        displayName: country.displayName,
        regionId: country.regionId,
      })),
    );
  }
}
