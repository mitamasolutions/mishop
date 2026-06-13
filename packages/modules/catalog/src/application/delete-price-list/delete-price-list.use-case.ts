import { err, ok, Result, UseCase } from '@mitama/core';
import { PriceListNotFoundError } from '../../domain/errors';
import type { PriceListRepository } from '../../domain/price-list.repository';

export interface DeletePriceListInput {
  id: string;
  actorUserId: string | null;
}

export class DeletePriceListUseCase implements UseCase<DeletePriceListInput, Result<void, PriceListNotFoundError>> {
  constructor(private readonly priceLists: PriceListRepository) {}

  async execute(input: DeletePriceListInput): Promise<Result<void, PriceListNotFoundError>> {
    const priceList = await this.priceLists.findById(input.id);
    if (!priceList) {
      return err(new PriceListNotFoundError(input.id));
    }

    await this.priceLists.remove(priceList, {
      userId: input.actorUserId,
      storeId: null,
      action: 'price-list.removed',
      entityType: 'price_list',
      entityId: priceList.id,
      diff: null,
    });

    return ok(undefined);
  }
}
