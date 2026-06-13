import { err, ok, Result, UseCase } from '@mitama/core';
import { StoreNotFoundError } from '../../domain/errors';
import type { StoreRepository } from '../../domain/store.repository';
import { toStoreOutput, type StoreOutput } from '../store.dto';
import type { SetStoreStatusInput } from './set-store-status.dto';

export class SetStoreStatusUseCase implements UseCase<SetStoreStatusInput, Result<StoreOutput, StoreNotFoundError>> {
  constructor(private readonly stores: StoreRepository) {}

  async execute(input: SetStoreStatusInput): Promise<Result<StoreOutput, StoreNotFoundError>> {
    const store = await this.stores.findById(input.id);
    if (!store) {
      return err(new StoreNotFoundError(input.id));
    }

    store.setActive(input.isActive);

    await this.stores.update(store, {
      userId: input.actorUserId,
      storeId: null,
      action: input.isActive ? 'store.activated' : 'store.deactivated',
      entityType: 'store',
      entityId: store.id,
      diff: { isActive: input.isActive },
    });

    return ok(toStoreOutput(store));
  }
}
