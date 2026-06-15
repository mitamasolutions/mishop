/**
 * Composición de la aplicación (regla 5: aquí no hay lógica de negocio).
 * Solo registra módulos de dominio y configuración global.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DbModule } from '@mitama/db';
import { AuthModule } from '@mitama/auth';
import { ReferenceDataModule } from '@mitama/reference-data';
import { StoresModule } from '@mitama/stores';
import { SettingsModule } from '@mitama/settings';
import { ActivityLogModule } from '@mitama/activity-log';
import { CatalogModule } from '@mitama/catalog';
import { InventoryModule } from '@mitama/inventory';
import { CustomersModule } from '@mitama/customers';
import { CartModule } from '@mitama/cart';
import { OrdersModule } from '@mitama/orders';
import { PaymentsModule } from '@mitama/payments';
import { ShippingModule } from '@mitama/shipping';
import { TaxesModule } from '@mitama/taxes';
import { PromotionsModule } from '@mitama/promotions';
import { GiftCardsModule } from '@mitama/giftcards';
import { ReviewsModule } from '@mitama/reviews';
import { ScheduledTasksModule } from '@mitama/scheduled-tasks';
import { EventBusModule } from './event-bus.module';
import { HealthController } from './health.controller';
import { ScheduledTaskHandlersWiring } from './scheduled-task-handlers.wiring';
import { validateEnv } from './config/env';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'], validate: validateEnv }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60000, limit: 100 },
      { name: 'auth', ttl: 60000, limit: 10 },
      { name: 'checkout', ttl: 60000, limit: 20 },
      { name: 'webhook', ttl: 60000, limit: 60 },
    ]),
    DbModule,
    EventBusModule,
    AuthModule,
    ReferenceDataModule,
    ActivityLogModule,
    StoresModule,
    SettingsModule,
    CatalogModule,
    InventoryModule,
    CustomersModule,
    CartModule,
    TaxesModule,
    ShippingModule,
    OrdersModule,
    PaymentsModule,
    PromotionsModule,
    GiftCardsModule,
    ReviewsModule,
    ScheduledTasksModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }, ScheduledTaskHandlersWiring],
})
export class AppModule {}
