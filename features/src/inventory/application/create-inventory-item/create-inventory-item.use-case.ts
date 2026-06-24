import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { InventoryItem } from '../../domain/inventory-item.entity';
import { InventoryItemSkuAlreadyInUseError, VariantAlreadyLinkedError } from '../../domain/errors';
import type { InventoryItemRepository } from '../../domain/inventory-item.repository';
import { toInventoryItemOutput, type InventoryItemOutput } from '../inventory-item.dto';
import type { CreateInventoryItemInput } from './create-inventory-item.dto';

export type CreateInventoryItemError =
  | ValidationError
  | InventoryItemSkuAlreadyInUseError
  | VariantAlreadyLinkedError;

export class CreateInventoryItemUseCase
  implements UseCase<CreateInventoryItemInput, Result<InventoryItemOutput, CreateInventoryItemError>>
{
  constructor(private readonly items: InventoryItemRepository) {}

  async execute(input: CreateInventoryItemInput): Promise<Result<InventoryItemOutput, CreateInventoryItemError>> {
    const sku = input.sku?.trim() || null;
    if (sku) {
      const existing = await this.items.findBySku(sku);
      if (existing) {
        return err(new InventoryItemSkuAlreadyInUseError(sku));
      }
    }

    if (input.variantId) {
      const existing = await this.items.findByVariantId(input.variantId);
      if (existing) {
        return err(new VariantAlreadyLinkedError(input.variantId));
      }
    }

    if (input.requiredQuantity !== undefined && input.requiredQuantity < 1) {
      return err(new ValidationError('La cantidad requerida debe ser mayor o igual a 1'));
    }

    const item = InventoryItem.create({
      sku,
      title: input.title ?? null,
      requiresShipping: input.requiresShipping,
      variantId: input.variantId ?? null,
      requiredQuantity: input.requiredQuantity,
      metadata: input.metadata ?? null,
    });

    await this.items.create(item, {
      userId: input.actorUserId,
      storeId: null,
      action: 'inventory.item.created',
      entityType: 'inventory_item',
      entityId: item.id,
      diff: { sku: item.sku, variantId: item.variantId },
    });

    return ok(toInventoryItemOutput(item));
  }
}
