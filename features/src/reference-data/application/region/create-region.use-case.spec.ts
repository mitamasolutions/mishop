import { describe, expect, it, beforeEach } from 'vitest';
import { ValidationError } from '@mitama/core';
import { Currency } from '../../domain/currency.entity';
import {
  InMemoryCurrencyRepository,
  InMemoryRegionRepository,
} from '../__test-utils__/in-memory-repositories';
import { CreateRegionUseCase } from './create-region.use-case';

describe('CreateRegionUseCase', () => {
  let regions: InMemoryRegionRepository;
  let currencies: InMemoryCurrencyRepository;
  let useCase: CreateRegionUseCase;

  beforeEach(() => {
    regions = new InMemoryRegionRepository();
    currencies = new InMemoryCurrencyRepository();
    currencies.currencies.set(
      'MXN',
      Currency.rehydrate('MXN', { symbol: '$', symbolNative: '$', decimalDigits: 2, rounding: 0, name: 'Mexican Peso' }),
    );
    useCase = new CreateRegionUseCase(regions, currencies);
  });

  it('crea una región con nombre y moneda válidos', async () => {
    const result = await useCase.execute({ name: 'México Norte', currencyCode: 'MXN', actorUserId: 'actor-1' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.regionId).toBeTruthy();
    }
    expect(regions.regions.size).toBe(1);
    expect(regions.recordedActivity).toHaveLength(1);
    expect(regions.recordedActivity[0].action).toBe('region.created');
  });

  it('falla si el nombre está vacío', async () => {
    const result = await useCase.execute({ name: '   ', currencyCode: 'MXN', actorUserId: 'actor-1' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(ValidationError);
  });

  it('falla si la moneda no existe en el catálogo', async () => {
    const result = await useCase.execute({ name: 'Región', currencyCode: 'XYZ', actorUserId: 'actor-1' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(ValidationError);
  });
});
