/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 */
import { Module } from '@nestjs/common';
import { createModuleProviders } from '@mitama/contracts';
import { INVENTORY_TOKENS } from './inventory.tokens';
import { CreateStockLocationUseCase } from './application/create-stock-location/create-stock-location.use-case';
import { UpdateStockLocationUseCase } from './application/update-stock-location/update-stock-location.use-case';
import { SetStockLocationStatusUseCase } from './application/set-stock-location-status/set-stock-location-status.use-case';
import { ListStockLocationsUseCase } from './application/list-stock-locations/list-stock-locations.use-case';
import { CreateInventoryItemUseCase } from './application/create-inventory-item/create-inventory-item.use-case';
import { UpdateInventoryItemUseCase } from './application/update-inventory-item/update-inventory-item.use-case';
import { GetInventoryItemUseCase } from './application/get-inventory-item/get-inventory-item.use-case';
import { GetInventoryItemByVariantUseCase } from './application/get-inventory-item-by-variant/get-inventory-item-by-variant.use-case';
import { ListInventoryItemsUseCase } from './application/list-inventory-items/list-inventory-items.use-case';
import { SetInventoryLevelUseCase } from './application/set-inventory-level/set-inventory-level.use-case';
import { RemoveInventoryLevelUseCase } from './application/remove-inventory-level/remove-inventory-level.use-case';
import { PrismaStockLocationRepository } from './infra/prisma-stock-location.repository';
import { PrismaInventoryItemRepository } from './infra/prisma-inventory-item.repository';
import { StockLocationsController } from './http/stock-locations.controller';
import { InventoryItemsController } from './http/inventory-items.controller';

@Module({
  controllers: [StockLocationsController, InventoryItemsController],
  providers: createModuleProviders([
    { provide: INVENTORY_TOKENS.locationRepository, useClass: PrismaStockLocationRepository },
    { provide: INVENTORY_TOKENS.itemRepository, useClass: PrismaInventoryItemRepository },
    { useCase: CreateStockLocationUseCase, inject: [INVENTORY_TOKENS.locationRepository] },
    { useCase: UpdateStockLocationUseCase, inject: [INVENTORY_TOKENS.locationRepository] },
    { useCase: SetStockLocationStatusUseCase, inject: [INVENTORY_TOKENS.locationRepository] },
    { useCase: ListStockLocationsUseCase, inject: [INVENTORY_TOKENS.locationRepository] },
    { useCase: CreateInventoryItemUseCase, inject: [INVENTORY_TOKENS.itemRepository] },
    { useCase: UpdateInventoryItemUseCase, inject: [INVENTORY_TOKENS.itemRepository] },
    { useCase: GetInventoryItemUseCase, inject: [INVENTORY_TOKENS.itemRepository] },
    { useCase: GetInventoryItemByVariantUseCase, inject: [INVENTORY_TOKENS.itemRepository] },
    { useCase: ListInventoryItemsUseCase, inject: [INVENTORY_TOKENS.itemRepository] },
    { useCase: SetInventoryLevelUseCase, inject: [INVENTORY_TOKENS.itemRepository, INVENTORY_TOKENS.locationRepository] },
    { useCase: RemoveInventoryLevelUseCase, inject: [INVENTORY_TOKENS.itemRepository] },
  ]),
  exports: [INVENTORY_TOKENS.itemRepository, INVENTORY_TOKENS.locationRepository],
})
export class InventoryModule {}
