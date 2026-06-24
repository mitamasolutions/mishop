import { err, ok, Result, UseCase } from '@mitama/core';
import { StoreNotFoundError } from '../../domain/errors';
import type { StoreRepository } from '../../domain/store.repository';
import { toStoreOutput, type StoreOutput } from '../store.dto';

export class GetStoreUseCase implements UseCase<string, Result<StoreOutput, StoreNotFoundError>> {
  constructor(private readonly stores: StoreRepository) {}

  async execute(id: string): Promise<Result<StoreOutput, StoreNotFoundError>> {
    const store = await this.stores.findById(id);
    if (!store) {
      return err(new StoreNotFoundError(id));
    }
    return ok(toStoreOutput(store));
  }
}
