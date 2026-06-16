import { err, ok, Result, UseCase } from '@mitama/core';
import { PriceListNotFoundError } from '../../domain/errors';
import type { PriceListRepository } from '../../domain/price-list.repository';
import { toPriceListOutput, type PriceListOutput } from '../price-list.dto';

export class GetPriceListUseCase implements UseCase<string, Result<PriceListOutput, PriceListNotFoundError>> {
  constructor(private readonly priceLists: PriceListRepository) {}

  async execute(id: string): Promise<Result<PriceListOutput, PriceListNotFoundError>> {
    const priceList = await this.priceLists.findById(id);
    if (!priceList) {
      return err(new PriceListNotFoundError(id));
    }
    return ok(toPriceListOutput(priceList));
  }
}
