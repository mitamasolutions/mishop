import { err, ok, Result, UseCase } from '@mitama/core';
import { InventoryItemNotFoundError } from '../../domain/errors';
import type { InventoryItemRepository } from '../../domain/inventory-item.repository';
import { toInventoryItemOutput, type InventoryItemOutput } from '../inventory-item.dto';

export class GetInventoryItemByVariantUseCase
  implements UseCase<string, Result<InventoryItemOutput, InventoryItemNotFoundError>>
{
  constructor(private readonly items: InventoryItemRepository) {}

  async execute(variantId: string): Promise<Result<InventoryItemOutput, InventoryItemNotFoundError>> {
    const item = await this.items.findByVariantId(variantId);
    if (!item) {
      return err(new InventoryItemNotFoundError(variantId));
    }
    return ok(toInventoryItemOutput(item));
  }
}
