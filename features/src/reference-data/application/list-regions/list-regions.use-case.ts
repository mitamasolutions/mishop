import { ok, Result, UseCase } from '@mitama/core';
import type { RegionRepository } from '../../domain/region.repository';
import type { RegionOutput } from './list-regions.dto';

export class ListRegionsUseCase implements UseCase<void, Result<RegionOutput[], never>> {
  constructor(private readonly regions: RegionRepository) {}

  async execute(): Promise<Result<RegionOutput[], never>> {
    const all = await this.regions.findAll();
    return ok(
      all.map((region) => ({
        id: region.id,
        name: region.name,
        currencyCode: region.currencyCode,
        automaticTaxes: region.automaticTaxes,
        isActive: region.isActive,
      })),
    );
  }
}
