import { ok, Result, UseCase } from '@mitama/core';
import type { PriceListRepository } from '../../domain/price-list.repository';
import { toPriceListOutput } from '../price-list.dto';
import type { ListPriceListsInput, ListPriceListsOutput } from './list-price-lists.dto';

export class ListPriceListsUseCase implements UseCase<ListPriceListsInput, Result<ListPriceListsOutput, never>> {
  constructor(private readonly priceLists: PriceListRepository) {}

  async execute(input: ListPriceListsInput): Promise<Result<ListPriceListsOutput, never>> {
    const page = await this.priceLists.findAll(input);
    return ok({
      items: page.items.map(toPriceListOutput),
      total: page.total,
      page: page.page,
      pageSize: page.pageSize,
    });
  }
}
