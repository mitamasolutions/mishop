/**
 * Composición de la aplicación (regla 5: aquí no hay lógica de negocio).
 * Solo registra módulos de dominio y configuración global.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DbModule } from '@mitama/db';
import {
  ActivityLogModule,
  AuthModule,
  CartModule,
  CatalogModule,
  CustomersModule,
  GiftCardsModule,
  InventoryModule,
  OrdersModule,
  PaymentsModule,
  PromotionsModule,
  ReferenceDataModule,
  ReviewsModule,
  ScheduledTasksModule,
  SettingsModule,
  ShippingModule,
  StoresModule,
  TaxesModule,
} from '@mitama/features';
import { EventBusModule } from './event-bus.module';
import { HealthController } from './health.controller';
import { ScheduledTaskHandlersWiring } from './scheduled-task-handlers.wiring';
import { validateEnv } from './config/env';
import { InfraExceptionFilter } from './infra-exception.filter';

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
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: InfraExceptionFilter },
    ScheduledTaskHandlersWiring,
  ],
})
export class AppModule {}
