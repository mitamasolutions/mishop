import { describe, expect, it } from 'vitest';
import { NotFoundError } from '@mitama/core';
import { Region } from '../../domain/region.entity';
import { InMemoryRegionRepository } from '../../infra/in-memory-region.repository';
import { GetRegionUseCase } from './get-region.use-case';

describe('GetRegionUseCase', () => {
  it('devuelve la región por id', async () => {
    const mexico = Region.rehydrate('mexico', {
      name: 'México',
      currencyCode: 'MXN',
      automaticTaxes: true,
      isActive: true,
      countriesIso2: [],
      paymentProviderIds: [],
    });
    const useCase = new GetRegionUseCase(new InMemoryRegionRepository([mexico]));

    const result = await useCase.execute('mexico');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.name).toBe('México');
    }
  });

  it('falla con NotFoundError si el id no existe', async () => {
    const useCase = new GetRegionUseCase(new InMemoryRegionRepository([]));

    const result = await useCase.execute('inexistente');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(NotFoundError);
    }
  });
});
