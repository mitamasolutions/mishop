import { describe, expect, it, beforeEach } from 'vitest';
import { Territory } from '../../domain/territory.entity';
import { Zone } from '../../domain/zone.entity';
import {
  InMemoryTerritoryRepository,
  InMemoryZoneRepository,
} from '../__test-utils__/in-memory-repositories';
import { DuplicateZoneCodeError, TerritoryNotFoundError } from '../../domain/errors';
import { CreateZoneUseCase } from './create-zone.use-case';

function makeTerritory(id: string, regionId = 'r1'): Territory {
  return Territory.rehydrate(id, {
    regionId,
    name: 'Test',
    code: 'TEST',
    isActive: true,
    automaticFulfillment: false,
    minSubtotal: null,
    minSubtotalWithTax: false,
    freeShippingThreshold: null,
    freeShippingThresholdWithTax: false,
    freeShippingNoDiscount: false,
    shippingCost: null,
    description: null,
  });
}

describe('CreateZoneUseCase', () => {
  let territories: InMemoryTerritoryRepository;
  let zones: InMemoryZoneRepository;
  let useCase: CreateZoneUseCase;

  beforeEach(() => {
    territories = new InMemoryTerritoryRepository();
    zones = new InMemoryZoneRepository();
    territories.territories.set('t1', makeTerritory('t1'));
    useCase = new CreateZoneUseCase(territories, zones);
  });

  it('crea una zona con nombre y código válidos', async () => {
    const result = await useCase.execute({ territoryId: 't1', name: 'Zona A', code: 'ZA', actorUserId: 'actor-1' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.zoneId).toBeTruthy();
    expect(zones.recordedActivity[0].action).toBe('zone.created');
  });

  it('falla si el territorio no existe', async () => {
    const result = await useCase.execute({
      territoryId: 'inexistente',
      name: 'Zona A',
      code: 'ZA',
      actorUserId: 'actor-1',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(TerritoryNotFoundError);
  });

  it('falla con código duplicado en el mismo territorio', async () => {
    zones.zones.set('z1', Zone.rehydrate('z1', { territoryId: 't1', name: 'Existente', code: 'ZA', isActive: true, description: null }));

    const result = await useCase.execute({ territoryId: 't1', name: 'Nueva', code: 'ZA', actorUserId: 'actor-1' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(DuplicateZoneCodeError);
  });

  it('permite el mismo código en territorios distintos', async () => {
    territories.territories.set('t2', makeTerritory('t2'));
    zones.zones.set('z1', Zone.rehydrate('z1', { territoryId: 't1', name: 'Zona A', code: 'ZA', isActive: true, description: null }));

    const result = await useCase.execute({ territoryId: 't2', name: 'Zona A', code: 'ZA', actorUserId: 'actor-1' });

    expect(result.isOk()).toBe(true);
  });
});
