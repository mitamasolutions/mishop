import { err, NotFoundError, ok, Result, UseCase } from '@mitama/core';
import type { RegionRepository } from '../../domain/region.repository';
import type { RegionOutput } from '../list-regions/list-regions.dto';

export class GetRegionUseCase implements UseCase<string, Result<RegionOutput, NotFoundError>> {
  constructor(private readonly regions: RegionRepository) {}

  async execute(id: string): Promise<Result<RegionOutput, NotFoundError>> {
    const region = await this.regions.findById(id);
    if (!region) {
      return err(new NotFoundError('La región', id));
    }
    return ok({
      id: region.id,
      name: region.name,
      currencyCode: region.currencyCode,
      automaticTaxes: region.automaticTaxes,
      isActive: region.isActive,
    });
  }
}
