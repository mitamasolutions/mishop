import { err, ok, Result, UseCase } from '@mitama/core';
import { InventoryItemNotFoundError, InventoryLevelNotFoundError } from '../../domain/errors';
import type { InventoryItemRepository } from '../../domain/inventory-item.repository';
import { toInventoryItemOutput, type InventoryItemOutput } from '../inventory-item.dto';
import type { RemoveInventoryLevelInput } from './remove-inventory-level.dto';

export type RemoveInventoryLevelError = InventoryItemNotFoundError | InventoryLevelNotFoundError;

export class RemoveInventoryLevelUseCase
  implements UseCase<RemoveInventoryLevelInput, Result<InventoryItemOutput, RemoveInventoryLevelError>>
{
  constructor(private readonly items: InventoryItemRepository) {}

  async execute(input: RemoveInventoryLevelInput): Promise<Result<InventoryItemOutput, RemoveInventoryLevelError>> {
    const item = await this.items.findById(input.itemId);
    if (!item) {
      return err(new InventoryItemNotFoundError(input.itemId));
    }

    const level = item.findLevel(input.locationId);
    if (!level) {
      return err(new InventoryLevelNotFoundError(input.locationId));
    }

    item.removeLevel(input.locationId);

    await this.items.update(item, {
      userId: input.actorUserId,
      storeId: null,
      action: 'inventory.level.removed',
      entityType: 'inventory_item',
      entityId: item.id,
      diff: { locationId: input.locationId },
    });

    return ok(toInventoryItemOutput(item));
  }
}
