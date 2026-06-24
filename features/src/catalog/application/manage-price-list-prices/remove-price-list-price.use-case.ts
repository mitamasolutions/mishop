import { err, ok, Result, UseCase } from '@mitama/core';
import { PriceListNotFoundError, PriceListPriceNotFoundError } from '../../domain/errors';
import type { PriceListRepository } from '../../domain/price-list.repository';
import { toPriceListOutput, type PriceListOutput } from '../price-list.dto';

export interface RemovePriceListPriceInput {
  priceListId: string;
  priceId: string;
  actorUserId: string | null;
}

export type RemovePriceListPriceError = PriceListNotFoundError | PriceListPriceNotFoundError;

export class RemovePriceListPriceUseCase
  implements UseCase<RemovePriceListPriceInput, Result<PriceListOutput, RemovePriceListPriceError>>
{
  constructor(private readonly priceLists: PriceListRepository) {}

  async execute(input: RemovePriceListPriceInput): Promise<Result<PriceListOutput, RemovePriceListPriceError>> {
    const priceList = await this.priceLists.findById(input.priceListId);
    if (!priceList) {
      return err(new PriceListNotFoundError(input.priceListId));
    }

    const removed = priceList.removePrice(input.priceId);
    if (!removed) {
      return err(new PriceListPriceNotFoundError(input.priceId));
    }

    await this.priceLists.update(priceList, {
      userId: input.actorUserId,
      storeId: null,
      action: 'price-list.price-removed',
      entityType: 'price_list',
      entityId: priceList.id,
      diff: { priceId: input.priceId },
    });

    return ok(toPriceListOutput(priceList));
  }
}
