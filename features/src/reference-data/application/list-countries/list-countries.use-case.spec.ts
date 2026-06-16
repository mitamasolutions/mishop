import { describe, expect, it } from 'vitest';
import { Country } from '../../domain/country.entity';
import { InMemoryCountryRepository } from '../../infra/in-memory-country.repository';
import { ListCountriesUseCase } from './list-countries.use-case';

describe('ListCountriesUseCase', () => {
  it('lista los países disponibles', async () => {
    const mexico = Country.rehydrate('MX', {
      iso3: 'MEX',
      numCode: '484',
      name: 'Mexico',
      displayName: 'México',
    });
    const useCase = new ListCountriesUseCase(new InMemoryCountryRepository([mexico]));

    const result = await useCase.execute();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual([
        { iso2: 'MX', iso3: 'MEX', numCode: '484', name: 'Mexico', displayName: 'México' },
      ]);
    }
  });
});
