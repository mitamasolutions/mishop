import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { InvalidDateRangeError } from '../../domain/errors';
import { PriceList } from '../../domain/price-list.entity';
import type { PriceListRepository } from '../../domain/price-list.repository';
import { toPriceListOutput, type PriceListOutput } from '../price-list.dto';
import type { CreatePriceListInput } from './create-price-list.dto';

export type CreatePriceListError = ValidationError | InvalidDateRangeError;

export class CreatePriceListUseCase implements UseCase<CreatePriceListInput, Result<PriceListOutput, CreatePriceListError>> {
  constructor(private readonly priceLists: PriceListRepository) {}

  async execute(input: CreatePriceListInput): Promise<Result<PriceListOutput, CreatePriceListError>> {
    const title = input.title.trim();
    if (!title) {
      return err(new ValidationError('El título de la lista de precios es obligatorio'));
    }

    const startsAt = input.startsAt ? new Date(input.startsAt) : null;
    const endsAt = input.endsAt ? new Date(input.endsAt) : null;
    if (startsAt && endsAt && endsAt < startsAt) {
      return err(new InvalidDateRangeError());
    }

    const priceList = PriceList.create({
      title,
      description: input.description ?? null,
      status: input.status,
      type: input.type,
      startsAt,
      endsAt,
    });

    await this.priceLists.create(priceList, {
      userId: input.actorUserId,
      storeId: null,
      action: 'price-list.created',
      entityType: 'price_list',
      entityId: priceList.id,
      diff: { title: priceList.title, status: priceList.status, type: priceList.type },
    });

    return ok(toPriceListOutput(priceList));
  }
}
