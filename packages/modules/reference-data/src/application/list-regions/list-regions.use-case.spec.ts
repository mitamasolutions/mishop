import { describe, expect, it } from 'vitest';
import { Region } from '../../domain/region.entity';
import { InMemoryRegionRepository } from '../../infra/in-memory-region.repository';
import { ListRegionsUseCase } from './list-regions.use-case';

describe('ListRegionsUseCase', () => {
  it('lista las regiones disponibles', async () => {
    const mexico = Region.rehydrate('mexico', {
      name: 'México',
      currencyCode: 'MXN',
      automaticTaxes: true,
    });
    const useCase = new ListRegionsUseCase(new InMemoryRegionRepository([mexico]));

    const result = await useCase.execute();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual([
        { id: 'mexico', name: 'México', currencyCode: 'MXN', automaticTaxes: true },
      ]);
    }
  });
});
