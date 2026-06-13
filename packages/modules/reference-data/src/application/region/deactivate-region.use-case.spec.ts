import { describe, expect, it, beforeEach } from 'vitest';
import { Region } from '../../domain/region.entity';
import {
  InMemoryRegionRepository,
} from '../__test-utils__/in-memory-repositories';
import { RegionHasActiveDependenciesError, RegionNotFoundError } from '../../domain/errors';
import { DeactivateRegionUseCase } from './deactivate-region.use-case';

function makeRegion(id: string): Region {
  return Region.rehydrate(id, {
    name: 'Test',
    currencyCode: 'MXN',
    automaticTaxes: true,
    isActive: true,
    countriesIso2: [],
    paymentProviderIds: [],
  });
}

describe('DeactivateRegionUseCase', () => {
  let regions: InMemoryRegionRepository;
  let useCase: DeactivateRegionUseCase;

  beforeEach(() => {
    regions = new InMemoryRegionRepository();
    regions.regions.set('r1', makeRegion('r1'));
    useCase = new DeactivateRegionUseCase(regions);
  });

  it('desactiva una región sin dependencias', async () => {
    const result = await useCase.execute({ regionId: 'r1', actorUserId: 'actor-1' });

    expect(result.isOk()).toBe(true);
    expect(regions.recordedActivity[0].action).toBe('region.deactivated');
  });

  it('falla si la región no existe', async () => {
    const result = await useCase.execute({ regionId: 'inexistente', actorUserId: 'actor-1' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(RegionNotFoundError);
  });

  it('falla si la región tiene territorios activos', async () => {
    // Hacemos que hasActiveDependencies retorne true
    regions.hasActiveDependencies = async () => true;

    const result = await useCase.execute({ regionId: 'r1', actorUserId: 'actor-1' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(RegionHasActiveDependenciesError);
  });
});
