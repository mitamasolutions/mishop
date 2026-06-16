import { err, ok, Result, UseCase } from '@mitama/core';
import { InvalidQuantityError, InventoryItemNotFoundError, StockLocationNotFoundError } from '../../domain/errors';
import type { InventoryItemRepository } from '../../domain/inventory-item.repository';
import type { StockLocationRepository } from '../../domain/stock-location.repository';
import { toInventoryItemOutput, type InventoryItemOutput } from '../inventory-item.dto';
import type { SetInventoryLevelInput } from './set-inventory-level.dto';

export type SetInventoryLevelError = InventoryItemNotFoundError | StockLocationNotFoundError | InvalidQuantityError;

export class SetInventoryLevelUseCase
  implements UseCase<SetInventoryLevelInput, Result<InventoryItemOutput, SetInventoryLevelError>>
{
  constructor(
    private readonly items: InventoryItemRepository,
    private readonly locations: StockLocationRepository,
  ) {}

  async execute(input: SetInventoryLevelInput): Promise<Result<InventoryItemOutput, SetInventoryLevelError>> {
    const item = await this.items.findById(input.itemId);
    if (!item) {
      return err(new InventoryItemNotFoundError(input.itemId));
    }

    const location = await this.locations.findById(input.locationId);
    if (!location) {
      return err(new StockLocationNotFoundError(input.locationId));
    }

    if (input.stockedQuantity !== undefined && input.stockedQuantity < 0) {
      return err(new InvalidQuantityError());
    }
    if (input.incomingQuantity !== undefined && input.incomingQuantity < 0) {
      return err(new InvalidQuantityError());
    }

    const level = item.setLevel(input.locationId, {
      stockedQuantity: input.stockedQuantity,
      incomingQuantity: input.incomingQuantity,
    });

    await this.items.update(item, {
      userId: input.actorUserId,
      storeId: null,
      action: 'inventory.level.set',
      entityType: 'inventory_item',
      entityId: item.id,
      diff: {
        locationId: level.locationId,
        stockedQuantity: level.stockedQuantity,
        reservedQuantity: level.reservedQuantity,
        incomingQuantity: level.incomingQuantity,
      },
    });

    return ok(toInventoryItemOutput(item));
  }
}
