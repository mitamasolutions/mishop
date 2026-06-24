/**
 * API pública del paquete `@mitama/features`: re-exporta los `*Module` Nest
 * y los símbolos públicos que consume `apps/api`. Cada feature mantiene su
 * propio aislamiento interno; entre features hermanas solo se permite
 * importar a través de su barrel (`./<feature>`) o `@mitama/contracts`.
 */

export { ActivityLogModule } from './activity-log';
export { AuthModule } from './auth';
export { CartModule } from './cart';
export { CatalogModule } from './catalog';
export { CustomersModule } from './customers';
export { GiftCardsModule } from './giftcards';
export { InventoryModule } from './inventory';
export {
  OrdersModule,
  ORDERS_TOKENS,
  DispatchOutboxEventsUseCase,
  DrainEmailQueueUseCase,
  ReleaseExpiredReservationsUseCase,
} from './orders';
export type { StockReservationService } from './orders';
export { PaymentsModule } from './payments';
export { PromotionsModule } from './promotions';
export { ReferenceDataModule } from './reference-data';
export { ReviewsModule } from './reviews';
export {
  ScheduledTasksModule,
  ScheduledTaskRegistry,
  SCHEDULED_TASKS_TOKENS,
} from './scheduled-tasks';
export { SettingsModule } from './settings';
export { ShippingModule } from './shipping';
export { StoresModule } from './stores';
export { TaxesModule } from './taxes';
