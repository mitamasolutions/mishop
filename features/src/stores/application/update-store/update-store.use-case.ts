import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import type { RecordActivityInput } from '@mitama/activity-log';
import type { CurrencyRepository, RegionRepository } from '@mitama/reference-data';
import { InvalidCurrencyError, InvalidRegionError, StoreNotFoundError } from '../../domain/errors';
import type { StoreRepository } from '../../domain/store.repository';
import { toStoreOutput, type StoreOutput } from '../store.dto';
import type { UpdateStoreInput } from './update-store.dto';

export type UpdateStoreError = ValidationError | StoreNotFoundError | InvalidCurrencyError | InvalidRegionError;

export class UpdateStoreUseCase implements UseCase<UpdateStoreInput, Result<StoreOutput, UpdateStoreError>> {
  constructor(
    private readonly stores: StoreRepository,
    private readonly currencies: CurrencyRepository,
    private readonly regions: RegionRepository,
  ) {}

  async execute(input: UpdateStoreInput): Promise<Result<StoreOutput, UpdateStoreError>> {
    const store = await this.stores.findById(input.id);
    if (!store) {
      return err(new StoreNotFoundError(input.id));
    }

    const changes: { name?: string; url?: string | null; currencyCode?: string; regionId?: string } = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        return err(new ValidationError('El nombre de la tienda es obligatorio'));
      }
      changes.name = name;
    }

    if (input.url !== undefined) {
      changes.url = input.url;
    }

    if (input.currencyCode !== undefined) {
      const currency = await this.currencies.findByCode(input.currencyCode);
      if (!currency) {
        return err(new InvalidCurrencyError(input.currencyCode));
      }
      changes.currencyCode = currency.code;
    }

    if (input.regionId !== undefined) {
      const region = await this.regions.findById(input.regionId);
      if (!region) {
        return err(new InvalidRegionError(input.regionId));
      }
      changes.regionId = region.id;
    }

    const before = toStoreOutput(store);
    store.update(changes);

    await this.stores.update(store, {
      userId: input.actorUserId,
      storeId: null,
      action: 'store.updated',
      entityType: 'store',
      entityId: store.id,
      diff: { before, after: toStoreOutput(store) } as unknown as NonNullable<RecordActivityInput['diff']>,
    });

    return ok(toStoreOutput(store));
  }
}
