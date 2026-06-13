import { err, ok, Result, UseCase } from '@mitama/core';
import { InventoryItemNotFoundError } from '../../domain/errors';
import type { InventoryItemRepository } from '../../domain/inventory-item.repository';
import { toInventoryItemOutput, type InventoryItemOutput } from '../inventory-item.dto';

export class GetInventoryItemUseCase implements UseCase<string, Result<InventoryItemOutput, InventoryItemNotFoundError>> {
  constructor(private readonly items: InventoryItemRepository) {}

  async execute(id: string): Promise<Result<InventoryItemOutput, InventoryItemNotFoundError>> {
    const item = await this.items.findById(id);
    if (!item) {
      return err(new InventoryItemNotFoundError(id));
    }
    return ok(toInventoryItemOutput(item));
  }
}
