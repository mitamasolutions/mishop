import { err, ok, Result, UseCase } from '@mitama/core';
import { TerritoryNotFoundError } from '../../domain/errors';
import type { Territory } from '../../domain/territory.entity';
import type { TerritoryRepository } from '../../domain/territory.repository';
import type { TerritoryOutput } from './territory.dto';

function toOutput(t: Territory): TerritoryOutput {
  return {
    id: t.id,
    regionId: t.regionId,
    name: t.name,
    code: t.code,
    isActive: t.isActive,
    automaticFulfillment: t.automaticFulfillment,
    minSubtotal: t.minSubtotal,
    minSubtotalWithTax: t.minSubtotalWithTax,
    freeShippingThreshold: t.freeShippingThreshold,
    freeShippingThresholdWithTax: t.freeShippingThresholdWithTax,
    freeShippingNoDiscount: t.freeShippingNoDiscount,
    shippingCost: t.shippingCost,
    description: t.description,
  };
}

export class GetTerritoryUseCase
  implements UseCase<string, Result<TerritoryOutput, TerritoryNotFoundError>>
{
  constructor(private readonly territories: TerritoryRepository) {}

  async execute(id: string): Promise<Result<TerritoryOutput, TerritoryNotFoundError>> {
    const territory = await this.territories.findById(id);
    if (!territory) {
      return err(new TerritoryNotFoundError(id));
    }
    return ok(toOutput(territory));
  }
}

export class ListTerritoriesByRegionUseCase implements UseCase<string, Result<TerritoryOutput[], never>> {
  constructor(private readonly territories: TerritoryRepository) {}

  async execute(regionId: string): Promise<Result<TerritoryOutput[], never>> {
    const all = await this.territories.findByRegionId(regionId);
    return ok(all.map(toOutput));
  }
}
