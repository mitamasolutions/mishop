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
import { EventBusModule } from './event-bus.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
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
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
