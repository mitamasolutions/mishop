import { ok, Result, UseCase } from '@mitama/core';
import type { StoreRepository } from '../../domain/store.repository';
import { toStoreOutput, type StoreOutput } from '../store.dto';

export class ListStoresUseCase implements UseCase<void, Result<StoreOutput[], never>> {
  constructor(private readonly stores: StoreRepository) {}

  async execute(): Promise<Result<StoreOutput[], never>> {
    const stores = await this.stores.findAll();
    return ok(stores.map(toStoreOutput));
  }
}
