import { describe, expect, it, beforeEach } from 'vitest';
import { ValidationError } from '@mitama/core';
import { Region } from '../../domain/region.entity';
import { Territory } from '../../domain/territory.entity';
import {
  InMemoryRegionRepository,
  InMemoryTerritoryRepository,
} from '../__test-utils__/in-memory-repositories';
import { DuplicateTerritoryCodeError, RegionNotFoundError } from '../../domain/errors';
import { CreateTerritoryUseCase } from './create-territory.use-case';

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

describe('CreateTerritoryUseCase', () => {
  let regions: InMemoryRegionRepository;
  let territories: InMemoryTerritoryRepository;
  let useCase: CreateTerritoryUseCase;

  beforeEach(() => {
    regions = new InMemoryRegionRepository();
    territories = new InMemoryTerritoryRepository();
    regions.regions.set('r1', makeRegion('r1'));
    useCase = new CreateTerritoryUseCase(regions, territories);
  });

  it('crea un territorio con nombre y código válidos', async () => {
    const result = await useCase.execute({
      regionId: 'r1',
      name: 'Norte',
      code: 'NORTE',
      actorUserId: 'actor-1',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.territoryId).toBeTruthy();
    expect(territories.recordedActivity[0].action).toBe('territory.created');
  });

  it('falla si la región no existe', async () => {
    const result = await useCase.execute({
      regionId: 'inexistente',
      name: 'Norte',
      code: 'NORTE',
      actorUserId: 'actor-1',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(RegionNotFoundError);
  });

  it('falla con código duplicado en la misma región', async () => {
    territories.territories.set(
      't1',
      Territory.rehydrate('t1', {
        regionId: 'r1',
        name: 'Existente',
        code: 'NORTE',
        isActive: true,
        automaticFulfillment: false,
        minSubtotal: null,
        minSubtotalWithTax: false,
        freeShippingThreshold: null,
        freeShippingThresholdWithTax: false,
        freeShippingNoDiscount: false,
        shippingCost: null,
        description: null,
      }),
    );

    const result = await useCase.execute({ regionId: 'r1', name: 'Nuevo', code: 'NORTE', actorUserId: 'actor-1' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(DuplicateTerritoryCodeError);
  });

  it('permite el mismo código en regiones distintas', async () => {
    regions.regions.set('r2', makeRegion('r2'));
    territories.territories.set(
      't1',
      Territory.rehydrate('t1', {
        regionId: 'r1',
        name: 'Norte R1',
        code: 'NORTE',
        isActive: true,
        automaticFulfillment: false,
        minSubtotal: null,
        minSubtotalWithTax: false,
        freeShippingThreshold: null,
        freeShippingThresholdWithTax: false,
        freeShippingNoDiscount: false,
        shippingCost: null,
        description: null,
      }),
    );

    const result = await useCase.execute({ regionId: 'r2', name: 'Norte R2', code: 'NORTE', actorUserId: 'actor-1' });

    expect(result.isOk()).toBe(true);
  });

  it('falla si el nombre está vacío', async () => {
    const result = await useCase.execute({ regionId: 'r1', name: '  ', code: 'NORTE', actorUserId: 'actor-1' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(ValidationError);
  });
});
