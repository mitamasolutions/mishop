import { err, ok, Result, UseCase } from '@mitama/core';
import { TerritoryHasActiveZonesError, TerritoryNotFoundError } from '../../domain/errors';
import type { TerritoryRepository } from '../../domain/territory.repository';
import type { DeactivateTerritoryInput } from './territory.dto';

export type DeactivateTerritoryError = TerritoryNotFoundError | TerritoryHasActiveZonesError;

export class DeactivateTerritoryUseCase
  implements UseCase<DeactivateTerritoryInput, Result<void, DeactivateTerritoryError>>
{
  constructor(private readonly territories: TerritoryRepository) {}

  async execute(input: DeactivateTerritoryInput): Promise<Result<void, DeactivateTerritoryError>> {
    const territory = await this.territories.findById(input.territoryId);
    if (!territory) {
      return err(new TerritoryNotFoundError(input.territoryId));
    }

    const hasActiveZones = await this.territories.hasActiveZones(input.territoryId);
    if (hasActiveZones) {
      return err(new TerritoryHasActiveZonesError());
    }

    await this.territories.softDelete(input.territoryId, {
      userId: input.actorUserId,
      storeId: null,
      action: 'territory.deactivated',
      entityType: 'territory',
      entityId: input.territoryId,
    });

    return ok(undefined);
  }
}
