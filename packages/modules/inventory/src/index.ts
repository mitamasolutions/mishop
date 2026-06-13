/**
 * API pública del módulo inventory. Otros paquetes SOLO pueden importar de aquí
 * (regla 3 de arquitectura). Los eventos compartidos viven en @mitama/contracts.
 */
export { InventoryModule } from './inventory.module';
export { INVENTORY_TOKENS } from './inventory.tokens';
export { StockLocation } from './domain/stock-location.entity';
export { InventoryItem } from './domain/inventory-item.entity';
export type { InventoryLevelProps } from './domain/inventory-item.entity';
export type { StockLocationRepository } from './domain/stock-location.repository';
export type { InventoryItemRepository, InventoryItemFilter, InventoryItemPage } from './domain/inventory-item.repository';
export type { StockLocationOutput } from './application/stock-location.dto';
export type { InventoryItemOutput, InventoryLevelOutput } from './application/inventory-item.dto';
export {
  StockLocationNotFoundError,
  InventoryItemNotFoundError,
  InventoryItemSkuAlreadyInUseError,
  VariantAlreadyLinkedError,
  InventoryLevelNotFoundError,
  InvalidQuantityError,
} from './domain/errors';
