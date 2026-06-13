import { err, ok, Result, UseCase } from '@mitama/core';
import { InventoryItemNotFoundError, InventoryItemSkuAlreadyInUseError } from '../../domain/errors';
import type { InventoryItemRepository } from '../../domain/inventory-item.repository';
import { toInventoryItemOutput, type InventoryItemOutput } from '../inventory-item.dto';
import type { UpdateInventoryItemInput } from './update-inventory-item.dto';

export type UpdateInventoryItemError = InventoryItemNotFoundError | InventoryItemSkuAlreadyInUseError;

export class UpdateInventoryItemUseCase
  implements UseCase<UpdateInventoryItemInput, Result<InventoryItemOutput, UpdateInventoryItemError>>
{
  constructor(private readonly items: InventoryItemRepository) {}

  async execute(input: UpdateInventoryItemInput): Promise<Result<InventoryItemOutput, UpdateInventoryItemError>> {
    const item = await this.items.findById(input.id);
    if (!item) {
      return err(new InventoryItemNotFoundError(input.id));
    }

    let sku: string | null | undefined;
    if (input.sku !== undefined) {
      sku = input.sku?.trim() || null;
      if (sku && sku !== item.sku) {
        const existing = await this.items.findBySku(sku);
        if (existing) {
          return err(new InventoryItemSkuAlreadyInUseError(sku));
        }
      }
    }

    item.update({ sku, title: input.title, requiresShipping: input.requiresShipping });

    await this.items.update(item, {
      userId: input.actorUserId,
      storeId: null,
      action: 'inventory.item.updated',
      entityType: 'inventory_item',
      entityId: item.id,
      diff: { sku: item.sku, title: item.title },
    });

    return ok(toInventoryItemOutput(item));
  }
}
