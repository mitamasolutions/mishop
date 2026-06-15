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
import { SCHEDULED_TASKS_TOKENS } from './scheduled-tasks.tokens';
import {
  ListScheduledTasksUseCase,
  RunDueScheduledTasksUseCase,
  UpdateScheduledTaskUseCase,
} from './application/scheduled-task.use-cases';
import { ScheduledTaskRegistry } from './domain/scheduled-task-registry';
import type { ScheduledTaskRepository } from './domain/scheduled-task';
import { PrismaScheduledTaskRepository } from './infra/prisma-scheduled-task.repository';
import { ScheduledTaskRunner } from './infra/scheduled-task.runner';
import { ScheduledTasksController } from './http/scheduled-tasks.controller';

@Global()
@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [ScheduledTasksController],
  providers: [
    { provide: SCHEDULED_TASKS_TOKENS.repository, useClass: PrismaScheduledTaskRepository },
    { provide: SCHEDULED_TASKS_TOKENS.registry, useValue: new ScheduledTaskRegistry() },
    {
      provide: ListScheduledTasksUseCase,
      useFactory: (repo: ScheduledTaskRepository) => new ListScheduledTasksUseCase(repo),
      inject: [SCHEDULED_TASKS_TOKENS.repository],
    },
    {
      provide: UpdateScheduledTaskUseCase,
      useFactory: (repo: ScheduledTaskRepository) => new UpdateScheduledTaskUseCase(repo),
      inject: [SCHEDULED_TASKS_TOKENS.repository],
    },
    {
      provide: RunDueScheduledTasksUseCase,
      useFactory: (repo: ScheduledTaskRepository, registry: ScheduledTaskRegistry) =>
        new RunDueScheduledTasksUseCase(repo, registry),
      inject: [SCHEDULED_TASKS_TOKENS.repository, SCHEDULED_TASKS_TOKENS.registry],
    },
    ScheduledTaskRunner,
  ],
  exports: [SCHEDULED_TASKS_TOKENS.registry, RunDueScheduledTasksUseCase],
})
export class ScheduledTasksModule {}
