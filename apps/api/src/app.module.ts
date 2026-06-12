/**
 * Composición de la aplicación (regla 5: aquí no hay lógica de negocio).
 * Solo registra módulos de dominio y configuración global.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from '@mitama/db';
import { AuthModule } from '@mitama/auth';
import { EventBusModule } from './event-bus.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    DbModule,
    EventBusModule,
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
