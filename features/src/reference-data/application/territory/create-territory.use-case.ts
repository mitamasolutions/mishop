import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { DuplicateTerritoryCodeError, RegionNotFoundError } from '../../domain/errors';
import { Territory } from '../../domain/territory.entity';
import type { RegionRepository } from '../../domain/region.repository';
import type { TerritoryRepository } from '../../domain/territory.repository';
import type { CreateTerritoryInput, CreateTerritoryOutput } from './territory.dto';

export type CreateTerritoryError = ValidationError | RegionNotFoundError | DuplicateTerritoryCodeError;

export class CreateTerritoryUseCase
  implements UseCase<CreateTerritoryInput, Result<CreateTerritoryOutput, CreateTerritoryError>>
{
  constructor(
    private readonly regions: RegionRepository,
    private readonly territories: TerritoryRepository,
  ) {}

  async execute(input: CreateTerritoryInput): Promise<Result<CreateTerritoryOutput, CreateTerritoryError>> {
    const name = input.name.trim();
    if (!name) {
      return err(new ValidationError('El nombre del territorio es obligatorio'));
    }

    const code = input.code.trim();
    if (!code) {
      return err(new ValidationError('El código del territorio es obligatorio'));
    }

    const region = await this.regions.findById(input.regionId);
    if (!region) {
      return err(new RegionNotFoundError(input.regionId));
    }

    const existing = await this.territories.findByCodeAndRegionId(code, input.regionId);
    if (existing) {
      return err(new DuplicateTerritoryCodeError(code));
    }

    const territory = Territory.create({ regionId: input.regionId, name, code, shipping: input.shipping });

    await this.territories.save(territory, {
      userId: input.actorUserId,
      storeId: null,
      action: 'territory.created',
      entityType: 'territory',
      entityId: territory.id,
    });

    return ok({ territoryId: territory.id });
  }
}
