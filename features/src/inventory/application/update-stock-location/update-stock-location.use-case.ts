import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { StockLocationNotFoundError } from '../../domain/errors';
import type { StockLocationRepository } from '../../domain/stock-location.repository';
import { toStockLocationOutput, type StockLocationOutput } from '../stock-location.dto';
import type { UpdateStockLocationInput } from './update-stock-location.dto';

export type UpdateStockLocationError = ValidationError | StockLocationNotFoundError;

export class UpdateStockLocationUseCase
  implements UseCase<UpdateStockLocationInput, Result<StockLocationOutput, UpdateStockLocationError>>
{
  constructor(private readonly locations: StockLocationRepository) {}

  async execute(input: UpdateStockLocationInput): Promise<Result<StockLocationOutput, UpdateStockLocationError>> {
    const location = await this.locations.findById(input.id);
    if (!location) {
      return err(new StockLocationNotFoundError(input.id));
    }

    let name: string | undefined;
    if (input.name !== undefined) {
      name = input.name.trim();
      if (!name) {
        return err(new ValidationError('El nombre de la ubicación es obligatorio'));
      }
    }

    location.update({ name, metadata: input.metadata });

    await this.locations.update(location, {
      userId: input.actorUserId,
      storeId: null,
      action: 'inventory.location.updated',
      entityType: 'stock_location',
      entityId: location.id,
      diff: { name: location.name },
    });

    return ok(toStockLocationOutput(location));
  }
}
