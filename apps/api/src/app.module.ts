/**
 * Composición de la aplicación (regla 5: aquí no hay lógica de negocio).
 * Solo registra módulos de dominio y configuración global.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from '@mitama/db';
import { AuthModule } from '@mitama/auth';
import { ReferenceDataModule } from '@mitama/reference-data';
import { StoresModule } from '@mitama/stores';
import { SettingsModule } from '@mitama/settings';
import { ActivityLogModule } from '@mitama/activity-log';
import { CatalogModule } from '@mitama/catalog';
import { InventoryModule } from '@mitama/inventory';
import { EventBusModule } from './event-bus.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    DbModule,
    EventBusModule,
    AuthModule,
    ReferenceDataModule,
    ActivityLogModule,
    StoresModule,
    SettingsModule,
    CatalogModule,
    InventoryModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
