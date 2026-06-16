/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 */
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { createModuleProviders } from '@mitama/contracts';
import { ReferenceDataModule, REFERENCE_DATA_TOKENS } from '@mitama/reference-data';
import { STORES_TOKENS } from './stores.tokens';
import { CreateStoreUseCase } from './application/create-store/create-store.use-case';
import { UpdateStoreUseCase } from './application/update-store/update-store.use-case';
import { SetStoreStatusUseCase } from './application/set-store-status/set-store-status.use-case';
import { ListStoresUseCase } from './application/list-stores/list-stores.use-case';
import { GetStoreUseCase } from './application/get-store/get-store.use-case';
import { PrismaStoreRepository } from './infra/prisma-store.repository';
import { StoresController } from './http/stores.controller';
import { StoreContextGuard } from './store-context.guard';
import { StoreContextInterceptor } from './store-context.interceptor';

@Module({
  imports: [ReferenceDataModule],
  controllers: [StoresController],
  providers: [
    ...createModuleProviders([
      { provide: STORES_TOKENS.storeRepository, useClass: PrismaStoreRepository },
      { useCase: CreateStoreUseCase, inject: [STORES_TOKENS.storeRepository, REFERENCE_DATA_TOKENS.currencyRepository, REFERENCE_DATA_TOKENS.regionRepository] },
      { useCase: UpdateStoreUseCase, inject: [STORES_TOKENS.storeRepository, REFERENCE_DATA_TOKENS.currencyRepository, REFERENCE_DATA_TOKENS.regionRepository] },
      { useCase: SetStoreStatusUseCase, inject: [STORES_TOKENS.storeRepository] },
      { useCase: ListStoresUseCase, inject: [STORES_TOKENS.storeRepository] },
      { useCase: GetStoreUseCase, inject: [STORES_TOKENS.storeRepository] },
    ]),
    StoreContextGuard,
    { provide: APP_GUARD, useExisting: StoreContextGuard },
    StoreContextInterceptor,
    { provide: APP_INTERCEPTOR, useExisting: StoreContextInterceptor },
  ],
  exports: [STORES_TOKENS.storeRepository],
})
export class StoresModule {}
