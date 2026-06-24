import { err, ok, Result, UseCase } from '@mitama/core';
import { ZoneNotFoundError } from '../../domain/errors';
import type { Zone } from '../../domain/zone.entity';
import type { ZoneRepository } from '../../domain/zone.repository';
import type { ZoneOutput } from './zone.dto';

function toOutput(z: Zone): ZoneOutput {
  return {
    id: z.id,
    territoryId: z.territoryId,
    name: z.name,
    code: z.code,
    isActive: z.isActive,
    description: z.description,
  };
}

export class GetZoneUseCase implements UseCase<string, Result<ZoneOutput, ZoneNotFoundError>> {
  constructor(private readonly zones: ZoneRepository) {}

  async execute(id: string): Promise<Result<ZoneOutput, ZoneNotFoundError>> {
    const zone = await this.zones.findById(id);
    if (!zone) {
      return err(new ZoneNotFoundError(id));
    }
    return ok(toOutput(zone));
  }
}

export class ListZonesByTerritoryUseCase implements UseCase<string, Result<ZoneOutput[], never>> {
  constructor(private readonly zones: ZoneRepository) {}

  async execute(territoryId: string): Promise<Result<ZoneOutput[], never>> {
    const all = await this.zones.findByTerritoryId(territoryId);
    return ok(all.map(toOutput));
  }
}
