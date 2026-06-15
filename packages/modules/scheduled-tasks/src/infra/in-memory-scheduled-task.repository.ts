import type { ScheduledTaskProps, ScheduledTaskRepository } from '../domain/scheduled-task';
import { isDue } from '../domain/scheduled-task';

/**
 * Repo in-memory para tests de application (sin Prisma). Implementa el
 * mismo contrato; `claim` es atómico bajo single-thread Node.js.
 */
export class InMemoryScheduledTaskRepository implements ScheduledTaskRepository {
  readonly tasks = new Map<string, ScheduledTaskProps>();

  async findAll(): Promise<ScheduledTaskProps[]> {
    return [...this.tasks.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async findById(id: string): Promise<ScheduledTaskProps | null> {
    return this.tasks.get(id) ?? null;
  }

  async findByName(name: string): Promise<ScheduledTaskProps | null> {
    for (const task of this.tasks.values()) if (task.name === name) return task;
    return null;
  }

  async findDue(now: Date): Promise<ScheduledTaskProps[]> {
    return (await this.findAll()).filter((task) => isDue(task, now));
  }

  async claim(id: string, now: Date, expectedLastStartUtc: Date | null): Promise<boolean> {
    const task = this.tasks.get(id);
    if (!task) return false;
    const sameTimestamp =
      (task.lastStartUtc?.getTime() ?? null) === (expectedLastStartUtc?.getTime() ?? null);
    if (!sameTimestamp) return false;
    this.tasks.set(id, { ...task, lastStartUtc: now, lastError: null });
    return true;
  }

  async recordResult(
    id: string,
    result: { endedAt: Date; success: boolean; error: string | null; disableOnError: boolean },
  ): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) return;
    this.tasks.set(id, {
      ...task,
      lastEndUtc: result.endedAt,
      lastSuccessUtc: result.success ? result.endedAt : task.lastSuccessUtc,
      lastError: result.error,
      enabled: result.disableOnError ? false : task.enabled,
      updatedAt: result.endedAt,
    });
  }

  async save(task: ScheduledTaskProps): Promise<void> {
    this.tasks.set(task.id, { ...task });
  }
}
