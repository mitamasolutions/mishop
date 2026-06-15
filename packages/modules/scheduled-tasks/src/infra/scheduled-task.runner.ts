import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { Interval, SchedulerRegistry } from '@nestjs/schedule';
import { SCHEDULED_TASKS_TOKENS } from '../scheduled-tasks.tokens';
import { RunDueScheduledTasksUseCase } from '../application/scheduled-task.use-cases';
import { ScheduledTaskRegistry } from '../domain/scheduled-task-registry';

const TICK_INTERVAL_MS = 30 * 1000; // 30s: granularidad suficiente para tareas de ≥60s

/**
 * Runner periódico de tareas programadas (r24 · sprint1_cierre).
 *
 * Se asume **una sola instancia de API** (single-runner). Cada tick busca
 * tareas due en `scheduled_tasks` y ejecuta su handler con lock por fila.
 * No reemplaza al cron externo: lo elimina.
 */
@Injectable()
export class ScheduledTaskRunner implements OnApplicationBootstrap {
  private readonly logger = new Logger(ScheduledTaskRunner.name);
  private running = false;

  constructor(
    private readonly runDueTasks: RunDueScheduledTasksUseCase,
    @Inject(SCHEDULED_TASKS_TOKENS.registry) private readonly registry: ScheduledTaskRegistry,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  onApplicationBootstrap(): void {
    this.logger.log(`Runner activo (tick=${TICK_INTERVAL_MS}ms). Handlers: ${this.registry.list().map((h) => h.type).join(', ') || '(ninguno)'}`);
  }

  /**
   * Tick que ejecuta tareas due. Se intercala vía `@Interval` (NestJS
   * scheduler). Si una pasada toma más que el tick, las siguientes se
   * saltan hasta que termine — sin overlap.
   */
  @Interval('scheduled-tasks-tick', TICK_INTERVAL_MS)
  async tick(): Promise<void> {
    if (this.running) {
      this.logger.debug('Tick saltado: pasada anterior todavía ejecutándose');
      return;
    }
    this.running = true;
    try {
      const result = await this.runDueTasks.execute(new Date());
      if (result.executed.length > 0 || result.failed.length > 0) {
        this.logger.log(`Ejecutadas: [${result.executed.join(', ')}] · Falladas: [${result.failed.join(', ')}]`);
      }
    } catch (error) {
      this.logger.error(`Tick falló: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.running = false;
    }
  }
}
