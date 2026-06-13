import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { DuplicateTerritoryCodeError, TerritoryNotFoundError } from '../../domain/errors';
import type { TerritoryRepository } from '../../domain/territory.repository';
import type { UpdateTerritoryInput } from './territory.dto';

export type UpdateTerritoryError = ValidationError | TerritoryNotFoundError | DuplicateTerritoryCodeError;

export class UpdateTerritoryUseCase
  implements UseCase<UpdateTerritoryInput, Result<void, UpdateTerritoryError>>
{
  constructor(private readonly territories: TerritoryRepository) {}

  async execute(input: UpdateTerritoryInput): Promise<Result<void, UpdateTerritoryError>> {
    const territory = await this.territories.findById(input.territoryId);
    if (!territory) {
      return err(new TerritoryNotFoundError(input.territoryId));
    }

    const changes: Parameters<typeof territory.update>[0] = { ...input.shipping };

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        return err(new ValidationError('El nombre del territorio no puede estar vacío'));
      }
      changes.name = name;
    }

    if (input.code !== undefined) {
      const code = input.code.trim();
      if (!code) {
        return err(new ValidationError('El código del territorio no puede estar vacío'));
      }
      if (code !== territory.code) {
        const existing = await this.territories.findByCodeAndRegionId(code, territory.regionId);
        if (existing) {
          return err(new DuplicateTerritoryCodeError(code));
        }
      }
      changes.code = code;
    }

    if (input.isActive !== undefined) {
      changes.isActive = input.isActive;
    }

    const updated = territory.update(changes);

    await this.territories.save(updated, {
      userId: input.actorUserId,
      storeId: null,
      action: 'territory.updated',
      entityType: 'territory',
      entityId: territory.id,
      diff: changes,
    });

    return ok(undefined);
  }
}
