import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { DuplicateZoneCodeError, ZoneNotFoundError } from '../../domain/errors';
import type { ZoneRepository } from '../../domain/zone.repository';
import type { UpdateZoneInput } from './zone.dto';

export type UpdateZoneError = ValidationError | ZoneNotFoundError | DuplicateZoneCodeError;

export class UpdateZoneUseCase implements UseCase<UpdateZoneInput, Result<void, UpdateZoneError>> {
  constructor(private readonly zones: ZoneRepository) {}

  async execute(input: UpdateZoneInput): Promise<Result<void, UpdateZoneError>> {
    const zone = await this.zones.findById(input.zoneId);
    if (!zone) {
      return err(new ZoneNotFoundError(input.zoneId));
    }

    const changes: Parameters<typeof zone.update>[0] = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        return err(new ValidationError('El nombre de la zona no puede estar vacío'));
      }
      changes.name = name;
    }

    if (input.code !== undefined) {
      const code = input.code.trim();
      if (!code) {
        return err(new ValidationError('El código de la zona no puede estar vacío'));
      }
      if (code !== zone.code) {
        const existing = await this.zones.findByCodeAndTerritoryId(code, zone.territoryId);
        if (existing) {
          return err(new DuplicateZoneCodeError(code));
        }
      }
      changes.code = code;
    }

    if (input.isActive !== undefined) {
      changes.isActive = input.isActive;
    }

    if (input.description !== undefined) {
      changes.description = input.description;
    }

    const updated = zone.update(changes);

    await this.zones.save(updated, {
      userId: input.actorUserId,
      storeId: null,
      action: 'zone.updated',
      entityType: 'zone',
      entityId: zone.id,
      diff: changes,
    });

    return ok(undefined);
  }
}
