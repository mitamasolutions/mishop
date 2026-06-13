import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { StockLocation } from '../../domain/stock-location.entity';
import type { StockLocationRepository } from '../../domain/stock-location.repository';
import { toStockLocationOutput, type StockLocationOutput } from '../stock-location.dto';
import type { CreateStockLocationInput } from './create-stock-location.dto';

export class CreateStockLocationUseCase
  implements UseCase<CreateStockLocationInput, Result<StockLocationOutput, ValidationError>>
{
  constructor(private readonly locations: StockLocationRepository) {}

  async execute(input: CreateStockLocationInput): Promise<Result<StockLocationOutput, ValidationError>> {
    const name = input.name.trim();
    if (!name) {
      return err(new ValidationError('El nombre de la ubicación es obligatorio'));
    }

    const location = StockLocation.create({ name, metadata: input.metadata ?? null });

    await this.locations.create(location, {
      userId: input.actorUserId,
      storeId: null,
      action: 'inventory.location.created',
      entityType: 'stock_location',
      entityId: location.id,
      diff: { name: location.name },
    });

    return ok(toStockLocationOutput(location));
  }
}
