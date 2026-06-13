import { ok, Result, UseCase } from '@mitama/core';
import type { InventoryItemRepository } from '../../domain/inventory-item.repository';
import { toInventoryItemOutput, type InventoryItemOutput } from '../inventory-item.dto';
import type { ListInventoryItemsInput } from './list-inventory-items.dto';

export interface ListInventoryItemsOutput {
  items: InventoryItemOutput[];
  total: number;
  page: number;
  pageSize: number;
}

export class ListInventoryItemsUseCase implements UseCase<ListInventoryItemsInput, Result<ListInventoryItemsOutput, never>> {
  constructor(private readonly items: InventoryItemRepository) {}

  async execute(input: ListInventoryItemsInput): Promise<Result<ListInventoryItemsOutput, never>> {
    const page = await this.items.findAll({
      search: input.search,
      page: input.page,
      pageSize: input.pageSize,
    });

    return ok({
      items: page.items.map(toInventoryItemOutput),
      total: page.total,
      page: page.page,
      pageSize: page.pageSize,
    });
  }
}
