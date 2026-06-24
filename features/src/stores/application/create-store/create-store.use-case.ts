import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import type { CurrencyRepository, RegionRepository } from '../../../reference-data';
import { Store } from '../../domain/store.entity';
import { StoreCodeAlreadyInUseError, InvalidCurrencyError, InvalidRegionError } from '../../domain/errors';
import type { StoreRepository } from '../../domain/store.repository';
import { toStoreOutput, type StoreOutput } from '../store.dto';
import type { CreateStoreInput } from './create-store.dto';

export type CreateStoreError =
  | ValidationError
  | StoreCodeAlreadyInUseError
  | InvalidCurrencyError
  | InvalidRegionError;

export class CreateStoreUseCase implements UseCase<CreateStoreInput, Result<StoreOutput, CreateStoreError>> {
  constructor(
    private readonly stores: StoreRepository,
    private readonly currencies: CurrencyRepository,
    private readonly regions: RegionRepository,
  ) {}

  async execute(input: CreateStoreInput): Promise<Result<StoreOutput, CreateStoreError>> {
    const name = input.name.trim();
    const code = input.code.trim().toLowerCase();

    if (!name) {
      return err(new ValidationError('El nombre de la tienda es obligatorio'));
    }
    if (!code) {
      return err(new ValidationError('El código de la tienda es obligatorio'));
    }

    const existing = await this.stores.findByCode(code);
    if (existing) {
      return err(new StoreCodeAlreadyInUseError(code));
    }

    const currency = await this.currencies.findByCode(input.currencyCode);
    if (!currency) {
      return err(new InvalidCurrencyError(input.currencyCode));
    }

    const region = await this.regions.findById(input.regionId);
    if (!region) {
      return err(new InvalidRegionError(input.regionId));
    }

    const store = Store.create({
      name,
      code,
      url: input.url ?? null,
      currencyCode: currency.code,
      regionId: region.id,
    });

    await this.stores.create(store, {
      userId: input.actorUserId,
      storeId: null,
      action: 'store.created',
      entityType: 'store',
      entityId: store.id,
      diff: {
        name: store.name,
        code: store.code,
        url: store.url,
        currencyCode: store.currencyCode,
        regionId: store.regionId,
      },
    });

    return ok(toStoreOutput(store));
  }
}
