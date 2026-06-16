import { err, ok, Result, UseCase } from '@mitama/core';
import { PriceListNotFoundError } from '../../domain/errors';
import type { PriceListStatus } from '../../domain/price-list.entity';
import type { PriceListRepository } from '../../domain/price-list.repository';
import { toPriceListOutput, type PriceListOutput } from '../price-list.dto';

export interface SetPriceListStatusInput {
  id: string;
  status: PriceListStatus;
  actorUserId: string | null;
}

export class SetPriceListStatusUseCase implements UseCase<SetPriceListStatusInput, Result<PriceListOutput, PriceListNotFoundError>> {
  constructor(private readonly priceLists: PriceListRepository) {}

  async execute(input: SetPriceListStatusInput): Promise<Result<PriceListOutput, PriceListNotFoundError>> {
    const priceList = await this.priceLists.findById(input.id);
    if (!priceList) {
      return err(new PriceListNotFoundError(input.id));
    }

    priceList.setStatus(input.status);

    await this.priceLists.update(priceList, {
      userId: input.actorUserId,
      storeId: null,
      action: input.status === 'active' ? 'price-list.activated' : 'price-list.deactivated',
      entityType: 'price_list',
      entityId: priceList.id,
      diff: { status: priceList.status },
    });

    return ok(toPriceListOutput(priceList));
  }
}
