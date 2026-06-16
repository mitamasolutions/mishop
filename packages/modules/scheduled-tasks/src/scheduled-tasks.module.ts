/**
 * Composición del módulo `scheduled-tasks` (r24 · sprint1_cierre).
 *
 * Registra:
 * - Repo Prisma + registry de handlers (token global para que los demás
 *   módulos publiquen sus handlers en el bootstrap).
 * - Use cases (list, update, run-due, run-by-name).
 * - Runner periódico (@nestjs/schedule, tick=30s).
 * - Tareas por defecto del MVP (dispatch-outbox / drain-email-queue /
 *   release-expired-reservations) — los handlers los provee
 *   `ScheduledTaskHandlersModule` en la composición (apps/api).
 * - Controller admin (Super Admin) para CRUD básico y "ejecutar ahora".
 */
import { Global, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { createModuleProviders } from '@mitama/contracts';
import { SCHEDULED_TASKS_TOKENS } from './scheduled-tasks.tokens';
import {
  ListScheduledTasksUseCase,
  RunDueScheduledTasksUseCase,
  UpdateScheduledTaskUseCase,
} from './application/scheduled-task.use-cases';
import { ScheduledTaskRegistry } from './domain/scheduled-task-registry';
import { PrismaScheduledTaskRepository } from './infra/prisma-scheduled-task.repository';
import { ScheduledTaskRunner } from './infra/scheduled-task.runner';
import { ScheduledTasksController } from './http/scheduled-tasks.controller';

@Global()
@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [ScheduledTasksController],
  providers: [
    ...createModuleProviders([
      { provide: SCHEDULED_TASKS_TOKENS.repository, useClass: PrismaScheduledTaskRepository },
      { provide: SCHEDULED_TASKS_TOKENS.registry, useValue: new ScheduledTaskRegistry() },
      { useCase: ListScheduledTasksUseCase, inject: [SCHEDULED_TASKS_TOKENS.repository] },
      { useCase: UpdateScheduledTaskUseCase, inject: [SCHEDULED_TASKS_TOKENS.repository] },
      { useCase: RunDueScheduledTasksUseCase, inject: [SCHEDULED_TASKS_TOKENS.repository, SCHEDULED_TASKS_TOKENS.registry] },
    ]),
    ScheduledTaskRunner,
  ],
  exports: [SCHEDULED_TASKS_TOKENS.registry, RunDueScheduledTasksUseCase],
})
export class ScheduledTasksModule {}
