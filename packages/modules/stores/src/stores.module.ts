/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 */
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ReferenceDataModule, REFERENCE_DATA_TOKENS } from '@mitama/reference-data';
import type { CurrencyRepository, RegionRepository } from '@mitama/reference-data';
import { STORES_TOKENS } from './stores.tokens';
import { CreateStoreUseCase } from './application/create-store/create-store.use-case';
import { UpdateStoreUseCase } from './application/update-store/update-store.use-case';
import { SetStoreStatusUseCase } from './application/set-store-status/set-store-status.use-case';
import { ListStoresUseCase } from './application/list-stores/list-stores.use-case';
import { GetStoreUseCase } from './application/get-store/get-store.use-case';
import type { StoreRepository } from './domain/store.repository';
import { PrismaStoreRepository } from './infra/prisma-store.repository';
import { StoresController } from './http/stores.controller';
import { StoreContextGuard } from './store-context.guard';
import { StoreContextInterceptor } from './store-context.interceptor';

@Module({
  imports: [ReferenceDataModule],
  controllers: [StoresController],
  providers: [
    { provide: STORES_TOKENS.storeRepository, useClass: PrismaStoreRepository },
    {
      provide: CreateStoreUseCase,
      useFactory: (stores: StoreRepository, currencies: CurrencyRepository, regions: RegionRepository) =>
        new CreateStoreUseCase(stores, currencies, regions),
      inject: [STORES_TOKENS.storeRepository, REFERENCE_DATA_TOKENS.currencyRepository, REFERENCE_DATA_TOKENS.regionRepository],
    },
    {
      provide: UpdateStoreUseCase,
      useFactory: (stores: StoreRepository, currencies: CurrencyRepository, regions: RegionRepository) =>
        new UpdateStoreUseCase(stores, currencies, regions),
      inject: [STORES_TOKENS.storeRepository, REFERENCE_DATA_TOKENS.currencyRepository, REFERENCE_DATA_TOKENS.regionRepository],
    },
    {
      provide: SetStoreStatusUseCase,
      useFactory: (stores: StoreRepository) => new SetStoreStatusUseCase(stores),
      inject: [STORES_TOKENS.storeRepository],
    },
    {
      provide: ListStoresUseCase,
      useFactory: (stores: StoreRepository) => new ListStoresUseCase(stores),
      inject: [STORES_TOKENS.storeRepository],
    },
    {
      provide: GetStoreUseCase,
      useFactory: (stores: StoreRepository) => new GetStoreUseCase(stores),
      inject: [STORES_TOKENS.storeRepository],
    },
    StoreContextGuard,
    { provide: APP_GUARD, useExisting: StoreContextGuard },
    StoreContextInterceptor,
    { provide: APP_INTERCEPTOR, useExisting: StoreContextInterceptor },
  ],
  exports: [STORES_TOKENS.storeRepository],
})
export class StoresModule {}
