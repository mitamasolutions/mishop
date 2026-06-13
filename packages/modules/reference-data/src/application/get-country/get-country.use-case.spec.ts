import { describe, expect, it } from 'vitest';
import { NotFoundError } from '@mitama/core';
import { Country } from '../../domain/country.entity';
import { InMemoryCountryRepository } from '../../infra/in-memory-country.repository';
import { GetCountryUseCase } from './get-country.use-case';

describe('GetCountryUseCase', () => {
  it('devuelve el país por iso2', async () => {
    const mexico = Country.rehydrate('MX', {
      iso3: 'MEX',
      numCode: '484',
      name: 'Mexico',
      displayName: 'México',
      regionId: 'mexico',
    });
    const useCase = new GetCountryUseCase(new InMemoryCountryRepository([mexico]));

    const result = await useCase.execute('MX');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.displayName).toBe('México');
    }
  });

  it('falla con NotFoundError si el iso2 no existe', async () => {
    const useCase = new GetCountryUseCase(new InMemoryCountryRepository([]));

    const result = await useCase.execute('ZZ');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(NotFoundError);
    }
  });
});
