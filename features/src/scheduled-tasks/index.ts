/**
 * API pública del módulo scheduled-tasks (r24 · sprint1_cierre).
 */
export { ScheduledTasksModule } from './scheduled-tasks.module';
export { SCHEDULED_TASKS_TOKENS } from './scheduled-tasks.tokens';
export { ScheduledTaskRegistry } from './domain/scheduled-task-registry';
export type { ScheduledTaskHandler, ScheduledTaskHandlerRegistration } from './domain/scheduled-task-registry';
export type { ScheduledTaskProps } from './domain/scheduled-task';
