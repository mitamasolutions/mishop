import { Module } from '@nestjs/common';
import { createModuleProviders } from '@mitama/contracts';
import { ACTIVITY_LOG_TOKENS } from './activity-log.tokens';
import { ListActivityLogUseCase } from './application/list-activity-log/list-activity-log.use-case';
import { PrismaActivityLogEntryRepository } from './infra/prisma-activity-log-entry.repository';
import { ActivityLogController } from './http/activity-log.controller';

/**
 * Composición del módulo. `recordActivity` se expone como función pura (ver
 * `record-activity.ts`) y la usan las infra de otros módulos dentro de su
 * propia transacción; aquí solo se compone el lado de lectura.
 */
@Module({
  controllers: [ActivityLogController],
  providers: createModuleProviders([
    { provide: ACTIVITY_LOG_TOKENS.entryRepository, useClass: PrismaActivityLogEntryRepository },
    { useCase: ListActivityLogUseCase, inject: [ACTIVITY_LOG_TOKENS.entryRepository] },
  ]),
})
export class ActivityLogModule {}
