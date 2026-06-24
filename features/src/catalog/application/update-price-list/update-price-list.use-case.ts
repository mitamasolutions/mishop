import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { InvalidDateRangeError, PriceListNotFoundError } from '../../domain/errors';
import type { PriceListRepository } from '../../domain/price-list.repository';
import { toPriceListOutput, type PriceListOutput } from '../price-list.dto';
import type { UpdatePriceListInput } from './update-price-list.dto';

export type UpdatePriceListError = ValidationError | PriceListNotFoundError | InvalidDateRangeError;

export class UpdatePriceListUseCase implements UseCase<UpdatePriceListInput, Result<PriceListOutput, UpdatePriceListError>> {
  constructor(private readonly priceLists: PriceListRepository) {}

  async execute(input: UpdatePriceListInput): Promise<Result<PriceListOutput, UpdatePriceListError>> {
    if (input.title !== undefined && !input.title.trim()) {
      return err(new ValidationError('El título de la lista de precios es obligatorio'));
    }

    const priceList = await this.priceLists.findById(input.id);
    if (!priceList) {
      return err(new PriceListNotFoundError(input.id));
    }

    const startsAt = input.startsAt !== undefined ? (input.startsAt ? new Date(input.startsAt) : null) : undefined;
    const endsAt = input.endsAt !== undefined ? (input.endsAt ? new Date(input.endsAt) : null) : undefined;

    const result = priceList.update({
      title: input.title?.trim(),
      description: input.description,
      type: input.type,
      startsAt,
      endsAt,
    });
    if (result === 'invalid_date_range') {
      return err(new InvalidDateRangeError());
    }

    await this.priceLists.update(priceList, {
      userId: input.actorUserId,
      storeId: null,
      action: 'price-list.updated',
      entityType: 'price_list',
      entityId: priceList.id,
      diff: { title: priceList.title },
    });

    return ok(toPriceListOutput(priceList));
  }
}
