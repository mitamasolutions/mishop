import { err, ok, Result, UseCase } from '@mitama/core';
import { StockLocationNotFoundError } from '../../domain/errors';
import type { StockLocationRepository } from '../../domain/stock-location.repository';
import { toStockLocationOutput, type StockLocationOutput } from '../stock-location.dto';
import type { SetStockLocationStatusInput } from './set-stock-location-status.dto';

export class SetStockLocationStatusUseCase
  implements UseCase<SetStockLocationStatusInput, Result<StockLocationOutput, StockLocationNotFoundError>>
{
  constructor(private readonly locations: StockLocationRepository) {}

  async execute(input: SetStockLocationStatusInput): Promise<Result<StockLocationOutput, StockLocationNotFoundError>> {
    const location = await this.locations.findById(input.id);
    if (!location) {
      return err(new StockLocationNotFoundError(input.id));
    }

    location.setActive(input.isActive);

    await this.locations.update(location, {
      userId: input.actorUserId,
      storeId: null,
      action: input.isActive ? 'inventory.location.activated' : 'inventory.location.deactivated',
      entityType: 'stock_location',
      entityId: location.id,
      diff: { isActive: input.isActive },
    });

    return ok(toStockLocationOutput(location));
  }
}
