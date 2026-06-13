/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 */
import { Module } from '@nestjs/common';
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
import type { StockLocationRepository } from './domain/stock-location.repository';
import type { InventoryItemRepository } from './domain/inventory-item.repository';
import { PrismaStockLocationRepository } from './infra/prisma-stock-location.repository';
import { PrismaInventoryItemRepository } from './infra/prisma-inventory-item.repository';
import { StockLocationsController } from './http/stock-locations.controller';
import { InventoryItemsController } from './http/inventory-items.controller';

@Module({
  controllers: [StockLocationsController, InventoryItemsController],
  providers: [
    { provide: INVENTORY_TOKENS.locationRepository, useClass: PrismaStockLocationRepository },
    { provide: INVENTORY_TOKENS.itemRepository, useClass: PrismaInventoryItemRepository },
    {
      provide: CreateStockLocationUseCase,
      useFactory: (locations: StockLocationRepository) => new CreateStockLocationUseCase(locations),
      inject: [INVENTORY_TOKENS.locationRepository],
    },
    {
      provide: UpdateStockLocationUseCase,
      useFactory: (locations: StockLocationRepository) => new UpdateStockLocationUseCase(locations),
      inject: [INVENTORY_TOKENS.locationRepository],
    },
    {
      provide: SetStockLocationStatusUseCase,
      useFactory: (locations: StockLocationRepository) => new SetStockLocationStatusUseCase(locations),
      inject: [INVENTORY_TOKENS.locationRepository],
    },
    {
      provide: ListStockLocationsUseCase,
      useFactory: (locations: StockLocationRepository) => new ListStockLocationsUseCase(locations),
      inject: [INVENTORY_TOKENS.locationRepository],
    },
    {
      provide: CreateInventoryItemUseCase,
      useFactory: (items: InventoryItemRepository) => new CreateInventoryItemUseCase(items),
      inject: [INVENTORY_TOKENS.itemRepository],
    },
    {
      provide: UpdateInventoryItemUseCase,
      useFactory: (items: InventoryItemRepository) => new UpdateInventoryItemUseCase(items),
      inject: [INVENTORY_TOKENS.itemRepository],
    },
    {
      provide: GetInventoryItemUseCase,
      useFactory: (items: InventoryItemRepository) => new GetInventoryItemUseCase(items),
      inject: [INVENTORY_TOKENS.itemRepository],
    },
    {
      provide: GetInventoryItemByVariantUseCase,
      useFactory: (items: InventoryItemRepository) => new GetInventoryItemByVariantUseCase(items),
      inject: [INVENTORY_TOKENS.itemRepository],
    },
    {
      provide: ListInventoryItemsUseCase,
      useFactory: (items: InventoryItemRepository) => new ListInventoryItemsUseCase(items),
      inject: [INVENTORY_TOKENS.itemRepository],
    },
    {
      provide: SetInventoryLevelUseCase,
      useFactory: (items: InventoryItemRepository, locations: StockLocationRepository) =>
        new SetInventoryLevelUseCase(items, locations),
      inject: [INVENTORY_TOKENS.itemRepository, INVENTORY_TOKENS.locationRepository],
    },
    {
      provide: RemoveInventoryLevelUseCase,
      useFactory: (items: InventoryItemRepository) => new RemoveInventoryLevelUseCase(items),
      inject: [INVENTORY_TOKENS.itemRepository],
    },
  ],
  exports: [INVENTORY_TOKENS.itemRepository, INVENTORY_TOKENS.locationRepository],
})
export class InventoryModule {}
