import { err, ok, Result, UseCase } from '@mitama/core';
import { RegionHasActiveDependenciesError, RegionNotFoundError } from '../../domain/errors';
import type { RegionRepository } from '../../domain/region.repository';
import type { DeactivateRegionInput } from './region.dto';

export type DeactivateRegionError = RegionNotFoundError | RegionHasActiveDependenciesError;

export class DeactivateRegionUseCase
  implements UseCase<DeactivateRegionInput, Result<void, DeactivateRegionError>>
{
  constructor(private readonly regions: RegionRepository) {}

  async execute(input: DeactivateRegionInput): Promise<Result<void, DeactivateRegionError>> {
    const region = await this.regions.findById(input.regionId);
    if (!region) {
      return err(new RegionNotFoundError(input.regionId));
    }

    const hasDependencies = await this.regions.hasActiveDependencies(input.regionId);
    if (hasDependencies) {
      return err(new RegionHasActiveDependenciesError());
    }

    await this.regions.softDelete(input.regionId, {
      userId: input.actorUserId,
      storeId: null,
      action: 'region.deactivated',
      entityType: 'region',
      entityId: input.regionId,
    });

    return ok(undefined);
  }
}
