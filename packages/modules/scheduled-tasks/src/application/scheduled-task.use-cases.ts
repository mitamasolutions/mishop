import type { ScheduledTaskProps, ScheduledTaskRepository } from '../domain/scheduled-task';
import type { ScheduledTaskRegistry } from '../domain/scheduled-task-registry';

/**
 * Logger mínimo que cualquier capa puede satisfacer (la capa application
 * no depende de NestJS). El módulo inyecta un adapter `console`-backed.
 */
export interface TaskLogger {
  warn(message: string): void;
  error(message: string): void;
}

const noopLogger: TaskLogger = { warn: () => {}, error: () => {} };

/**
 * Ejecuta todas las tareas due en una pasada. Pensado para ser invocado por
 * un tick periódico (`@nestjs/schedule`) o manualmente (admin "ejecutar
 * ahora"). El runner asume **una sola instancia de API**; el lock por fila
 * evita que la misma tarea se solape consigo misma dentro de la instancia
 * (r24 · sprint1_cierre).
 */
export class RunDueScheduledTasksUseCase {
  constructor(
    private readonly tasks: ScheduledTaskRepository,
    private readonly registry: ScheduledTaskRegistry,
    private readonly logger: TaskLogger = noopLogger,
  ) {}

  async execute(now: Date = new Date()): Promise<{ executed: string[]; failed: string[] }> {
    const due = await this.tasks.findDue(now);
    const executed: string[] = [];
    const failed: string[] = [];
    for (const task of due) {
      const ran = await this.runOne(task, now);
      if (ran === 'success') executed.push(task.name);
      if (ran === 'error') failed.push(task.name);
    }
    return { executed, failed };
  }

  /** Ejecuta una tarea por nombre, ignorando si está deshabilitada. */
  async runByName(name: string): Promise<{ ok: boolean; error: string | null }> {
    const task = await this.tasks.findByName(name);
    if (!task) return { ok: false, error: `Tarea ${name} no existe` };
    const handler = this.registry.get(task.type);
    if (!handler) return { ok: false, error: `Handler ${task.type} no registrado` };
    const result = await this.executeHandler(task, handler, new Date(), { force: true });
    return { ok: result === 'success', error: result === 'success' ? null : 'Falló la ejecución' };
  }

  private async runOne(task: ScheduledTaskProps, now: Date): Promise<'success' | 'error' | 'skipped'> {
    const handler = this.registry.get(task.type);
    if (!handler) {
      this.logger.warn(`Handler ${task.type} no registrado para la tarea ${task.name}; skip`);
      return 'skipped';
    }
    // Lock por fila contra solapamiento.
    const claimed = await this.tasks.claim(task.id, now, task.lastStartUtc);
    if (!claimed) return 'skipped';
    return this.executeHandler(task, handler, now);
  }

  private async executeHandler(
    task: ScheduledTaskProps,
    handler: { run: () => Promise<{ ok: boolean; message?: string }> },
    startedAt: Date,
    options: { force?: boolean } = {},
  ): Promise<'success' | 'error'> {
    if (options.force) {
      // Para "run-now" sí actualizamos lastStartUtc sin requisito de match.
      await this.tasks.claim(task.id, startedAt, task.lastStartUtc);
    }
    try {
      const result = await handler.run();
      const endedAt = new Date();
      if (result.ok) {
        await this.tasks.recordResult(task.id, { endedAt, success: true, error: null, disableOnError: false });
        return 'success';
      }
      const message = result.message ?? 'La tarea reportó error sin mensaje';
      await this.tasks.recordResult(task.id, { endedAt, success: false, error: message, disableOnError: task.stopOnError });
      this.logger.warn(`Tarea ${task.name} reportó error: ${message}`);
      return 'error';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Tarea ${task.name} lanzó excepción: ${message}`);
      await this.tasks.recordResult(task.id, { endedAt: new Date(), success: false, error: message, disableOnError: task.stopOnError });
      return 'error';
    }
  }
}

/** Lista plana para admin. */
export class ListScheduledTasksUseCase {
  constructor(private readonly tasks: ScheduledTaskRepository) {}
  async execute(): Promise<ScheduledTaskProps[]> {
    return this.tasks.findAll();
  }
}

/** Edita intervalo / enabled / stopOnError de una tarea (admin). */
export class UpdateScheduledTaskUseCase {
  constructor(private readonly tasks: ScheduledTaskRepository) {}

  async execute(id: string, patch: { seconds?: number; enabled?: boolean; stopOnError?: boolean }): Promise<ScheduledTaskProps | null> {
    const task = await this.tasks.findById(id);
    if (!task) return null;
    const updated: ScheduledTaskProps = {
      ...task,
      seconds: patch.seconds && patch.seconds > 0 ? patch.seconds : task.seconds,
      enabled: patch.enabled ?? task.enabled,
      stopOnError: patch.stopOnError ?? task.stopOnError,
      updatedAt: new Date(),
    };
    await this.tasks.save(updated);
    return updated;
  }
}
