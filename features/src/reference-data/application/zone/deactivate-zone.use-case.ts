import { err, ok, Result, UseCase } from '@mitama/core';
import { ZoneNotFoundError } from '../../domain/errors';
import type { ZoneRepository } from '../../domain/zone.repository';
import type { DeactivateZoneInput } from './zone.dto';

export class DeactivateZoneUseCase implements UseCase<DeactivateZoneInput, Result<void, ZoneNotFoundError>> {
  constructor(private readonly zones: ZoneRepository) {}

  async execute(input: DeactivateZoneInput): Promise<Result<void, ZoneNotFoundError>> {
    const zone = await this.zones.findById(input.zoneId);
    if (!zone) {
      return err(new ZoneNotFoundError(input.zoneId));
    }

    await this.zones.softDelete(input.zoneId, {
      userId: input.actorUserId,
      storeId: null,
      action: 'zone.deactivated',
      entityType: 'zone',
      entityId: input.zoneId,
    });

    return ok(undefined);
  }
}
