import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { DuplicateZoneCodeError, TerritoryNotFoundError } from '../../domain/errors';
import { Zone } from '../../domain/zone.entity';
import type { TerritoryRepository } from '../../domain/territory.repository';
import type { ZoneRepository } from '../../domain/zone.repository';
import type { CreateZoneInput, CreateZoneOutput } from './zone.dto';

export type CreateZoneError = ValidationError | TerritoryNotFoundError | DuplicateZoneCodeError;

export class CreateZoneUseCase implements UseCase<CreateZoneInput, Result<CreateZoneOutput, CreateZoneError>> {
  constructor(
    private readonly territories: TerritoryRepository,
    private readonly zones: ZoneRepository,
  ) {}

  async execute(input: CreateZoneInput): Promise<Result<CreateZoneOutput, CreateZoneError>> {
    const name = input.name.trim();
    if (!name) {
      return err(new ValidationError('El nombre de la zona es obligatorio'));
    }

    const code = input.code.trim();
    if (!code) {
      return err(new ValidationError('El código de la zona es obligatorio'));
    }

    const territory = await this.territories.findById(input.territoryId);
    if (!territory) {
      return err(new TerritoryNotFoundError(input.territoryId));
    }

    const existing = await this.zones.findByCodeAndTerritoryId(code, input.territoryId);
    if (existing) {
      return err(new DuplicateZoneCodeError(code));
    }

    const zone = Zone.create({ territoryId: input.territoryId, name, code, description: input.description });

    await this.zones.save(zone, {
      userId: input.actorUserId,
      storeId: null,
      action: 'zone.created',
      entityType: 'zone',
      entityId: zone.id,
    });

    return ok({ zoneId: zone.id });
  }
}
