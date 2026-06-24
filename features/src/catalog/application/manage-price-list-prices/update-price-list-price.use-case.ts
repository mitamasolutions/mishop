import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { InvalidTierPriceRangeError, PriceListNotFoundError, PriceListPriceNotFoundError } from '../../domain/errors';
import type { PriceListRepository } from '../../domain/price-list.repository';
import { toPriceListOutput, type PriceListOutput } from '../price-list.dto';

export interface UpdatePriceListPriceInput {
  priceListId: string;
  priceId: string;
  amount?: number;
  minQuantity?: number | null;
  maxQuantity?: number | null;
  actorUserId: string | null;
}

export type UpdatePriceListPriceError = ValidationError | PriceListNotFoundError | PriceListPriceNotFoundError | InvalidTierPriceRangeError;

export class UpdatePriceListPriceUseCase
  implements UseCase<UpdatePriceListPriceInput, Result<PriceListOutput, UpdatePriceListPriceError>>
{
  constructor(private readonly priceLists: PriceListRepository) {}

  async execute(input: UpdatePriceListPriceInput): Promise<Result<PriceListOutput, UpdatePriceListPriceError>> {
    if (input.amount !== undefined && input.amount < 0) {
      return err(new ValidationError('El precio no puede ser negativo'));
    }

    const priceList = await this.priceLists.findById(input.priceListId);
    if (!priceList) {
      return err(new PriceListNotFoundError(input.priceListId));
    }

    const result = priceList.updatePrice(input.priceId, {
      amount: input.amount,
      minQuantity: input.minQuantity,
      maxQuantity: input.maxQuantity,
    });
    if (result === 'not_found') {
      return err(new PriceListPriceNotFoundError(input.priceId));
    }
    if (result === 'invalid_range') {
      return err(new InvalidTierPriceRangeError());
    }

    await this.priceLists.update(priceList, {
      userId: input.actorUserId,
      storeId: null,
      action: 'price-list.price-updated',
      entityType: 'price_list',
      entityId: priceList.id,
      diff: { priceId: input.priceId },
    });

    return ok(toPriceListOutput(priceList));
  }
}
