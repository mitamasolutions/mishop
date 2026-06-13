import { err, NotFoundError, ok, Result, UseCase } from '@mitama/core';
import type { CountryRepository } from '../../domain/country.repository';
import type { CountryOutput } from '../list-countries/list-countries.dto';

export class GetCountryUseCase implements UseCase<string, Result<CountryOutput, NotFoundError>> {
  constructor(private readonly countries: CountryRepository) {}

  async execute(iso2: string): Promise<Result<CountryOutput, NotFoundError>> {
    const country = await this.countries.findByIso2(iso2);
    if (!country) {
      return err(new NotFoundError('El país', iso2));
    }
    return ok({
      iso2: country.iso2,
      iso3: country.iso3,
      numCode: country.numCode,
      name: country.name,
      displayName: country.displayName,
    });
  }
}
