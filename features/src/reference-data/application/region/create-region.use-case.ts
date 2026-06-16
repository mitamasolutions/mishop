import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { Region } from '../../domain/region.entity';
import type { RegionRepository } from '../../domain/region.repository';
import type { CurrencyRepository } from '../../domain/currency.repository';
import type { CreateRegionInput, CreateRegionOutput } from './region.dto';

export type CreateRegionError = ValidationError;

export class CreateRegionUseCase
  implements UseCase<CreateRegionInput, Result<CreateRegionOutput, CreateRegionError>>
{
  constructor(
    private readonly regions: RegionRepository,
    private readonly currencies: CurrencyRepository,
  ) {}

  async execute(input: CreateRegionInput): Promise<Result<CreateRegionOutput, CreateRegionError>> {
    const name = input.name.trim();
    if (!name) {
      return err(new ValidationError('El nombre de la región es obligatorio'));
    }

    const currency = await this.currencies.findByCode(input.currencyCode);
    if (!currency) {
      return err(new ValidationError(`La moneda '${input.currencyCode}' no existe en el catálogo`));
    }

    const region = Region.create({ name, currencyCode: input.currencyCode });

    await this.regions.save(region, {
      userId: input.actorUserId,
      storeId: null,
      action: 'region.created',
      entityType: 'region',
      entityId: region.id,
    });

    return ok({ regionId: region.id });
  }
}
