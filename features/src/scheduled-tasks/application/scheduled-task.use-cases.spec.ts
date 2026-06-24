import { describe, expect, it } from 'vitest';
import { InMemoryScheduledTaskRepository } from '../infra/in-memory-scheduled-task.repository';
import { ScheduledTaskRegistry } from '../domain/scheduled-task-registry';
import { RunDueScheduledTasksUseCase, UpdateScheduledTaskUseCase } from './scheduled-task.use-cases';

const baseTask = {
  id: 't-1',
  name: 'tick',
  type: 'tick',
  seconds: 60,
  enabled: true,
  stopOnError: false,
  lastStartUtc: null,
  lastEndUtc: null,
  lastSuccessUtc: null,
  lastError: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('scheduled tasks (r24 · sprint1_cierre)', () => {
  it('ejecuta tareas due, actualiza last_*_utc y NO se solapa consigo misma', async () => {
    const repo = new InMemoryScheduledTaskRepository();
    const registry = new ScheduledTaskRegistry();
    await repo.save({ ...baseTask });
    let runs = 0;
    registry.register({ type: 'tick', description: 'test', run: async () => { runs += 1; return { ok: true }; } });

    const useCase = new RunDueScheduledTasksUseCase(repo, registry);
    const t0 = new Date('2026-01-01T00:01:00Z');
    const first = await useCase.execute(t0);
    expect(first.executed).toEqual(['tick']);
    expect(runs).toBe(1);

    // Inmediatamente después no es due (lastStartUtc + 60s > t0+1ms)
    const second = await useCase.execute(new Date(t0.getTime() + 1));
    expect(second.executed).toEqual([]);
    expect(runs).toBe(1);

    const stored = await repo.findById('t-1');
    expect(stored?.lastStartUtc?.toISOString()).toBe(t0.toISOString());
    expect(stored?.lastSuccessUtc).not.toBeNull();
    expect(stored?.lastError).toBeNull();
  });

  it('marca lastError cuando el handler reporta error y deshabilita si stopOnError', async () => {
    const repo = new InMemoryScheduledTaskRepository();
    const registry = new ScheduledTaskRegistry();
    await repo.save({ ...baseTask, stopOnError: true });
    registry.register({ type: 'tick', description: 'test', run: async () => { throw new Error('boom'); } });

    const result = await new RunDueScheduledTasksUseCase(repo, registry).execute(new Date('2026-01-01T00:01:00Z'));
    expect(result.failed).toEqual(['tick']);

    const stored = await repo.findById('t-1');
    expect(stored?.lastError).toContain('boom');
    expect(stored?.enabled).toBe(false);
  });

  it('runByName ignora intervalos y respeta tareas inexistentes', async () => {
    const repo = new InMemoryScheduledTaskRepository();
    const registry = new ScheduledTaskRegistry();
    await repo.save({ ...baseTask, lastStartUtc: new Date() });
    registry.register({ type: 'tick', description: 'test', run: async () => ({ ok: true }) });

    const useCase = new RunDueScheduledTasksUseCase(repo, registry);
    const ok = await useCase.runByName('tick');
    expect(ok.ok).toBe(true);

    const missing = await useCase.runByName('inexistente');
    expect(missing.ok).toBe(false);
  });

  it('UpdateScheduledTaskUseCase aplica patch parcial', async () => {
    const repo = new InMemoryScheduledTaskRepository();
    await repo.save({ ...baseTask });
    const useCase = new UpdateScheduledTaskUseCase(repo);

    const updated = await useCase.execute('t-1', { seconds: 120, enabled: false });
    expect(updated?.seconds).toBe(120);
    expect(updated?.enabled).toBe(false);

    // seconds inválido no modifica
    const unchanged = await useCase.execute('t-1', { seconds: 0 });
    expect(unchanged?.seconds).toBe(120);
  });
});
