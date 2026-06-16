import { describe, expect, it } from 'vitest';
import { Region } from '../../domain/region.entity';
import { InMemoryRegionRepository } from '../../infra/in-memory-region.repository';
import { ListRegionsUseCase } from './list-regions.use-case';

describe('ListRegionsUseCase', () => {
  it('lista las regiones activas', async () => {
    const mexico = Region.rehydrate('mexico', {
      name: 'México',
      currencyCode: 'MXN',
      automaticTaxes: true,
      isActive: true,
      countriesIso2: [],
      paymentProviderIds: [],
    });
    const useCase = new ListRegionsUseCase(new InMemoryRegionRepository([mexico]));

    const result = await useCase.execute();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].id).toBe('mexico');
      expect(result.value[0].name).toBe('México');
      expect(result.value[0].isActive).toBe(true);
    }
  });

  it('no lista regiones inactivas', async () => {
    const inactive = Region.rehydrate('mexico', {
      name: 'México',
      currencyCode: 'MXN',
      automaticTaxes: true,
      isActive: false,
      countriesIso2: [],
      paymentProviderIds: [],
    });
    const useCase = new ListRegionsUseCase(new InMemoryRegionRepository([inactive]));

    const result = await useCase.execute();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(0);
    }
  });
});
