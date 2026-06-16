import { describe, expect, it } from 'vitest';
import { InMemoryActivityLogEntryRepository } from '../../infra/in-memory-activity-log-entry.repository';
import { ActivityLogEntry } from '../../domain/activity-log-entry.entity';
import { ListActivityLogUseCase } from './list-activity-log.use-case';

function makeEntry(overrides: Partial<{ storeId: string | null; userId: string | null; action: string; entityType: string; createdAt: Date }>) {
  return ActivityLogEntry.rehydrate(
    {
      userId: overrides.userId ?? 'user-1',
      storeId: overrides.storeId ?? 'store-1',
      action: overrides.action ?? 'setting.updated',
      entityType: overrides.entityType ?? 'setting',
      entityId: 'entity-1',
      ip: '127.0.0.1',
      diff: null,
      createdAt: overrides.createdAt ?? new Date('2026-01-01T00:00:00Z'),
    },
    crypto.randomUUID(),
  );
}

describe('ListActivityLogUseCase', () => {
  it('filtra por tienda', async () => {
    const repo = new InMemoryActivityLogEntryRepository();
    repo.entries.push(makeEntry({ storeId: 'store-1' }), makeEntry({ storeId: 'store-2' }));
    const useCase = new ListActivityLogUseCase(repo);

    const result = await useCase.execute({ storeId: 'store-1' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]?.storeId).toBe('store-1');
      expect(result.value.total).toBe(1);
    }
  });

  it('filtra por usuario, entidad y acción', async () => {
    const repo = new InMemoryActivityLogEntryRepository();
    repo.entries.push(
      makeEntry({ userId: 'user-1', action: 'setting.updated', entityType: 'setting' }),
      makeEntry({ userId: 'user-2', action: 'role.created', entityType: 'role' }),
    );
    const useCase = new ListActivityLogUseCase(repo);

    const result = await useCase.execute({ userId: 'user-2', action: 'role.created', entityType: 'role' });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]?.userId).toBe('user-2');
    }
  });

  it('filtra por rango de fechas', async () => {
    const repo = new InMemoryActivityLogEntryRepository();
    repo.entries.push(
      makeEntry({ createdAt: new Date('2026-01-01T00:00:00Z') }),
      makeEntry({ createdAt: new Date('2026-02-01T00:00:00Z') }),
    );
    const useCase = new ListActivityLogUseCase(repo);

    const result = await useCase.execute({ from: new Date('2026-01-15T00:00:00Z') });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]?.createdAt).toEqual(new Date('2026-02-01T00:00:00Z'));
    }
  });

  it('pagina los resultados, más recientes primero', async () => {
    const repo = new InMemoryActivityLogEntryRepository();
    for (let i = 0; i < 5; i++) {
      repo.entries.push(makeEntry({ createdAt: new Date(2026, 0, i + 1) }));
    }
    const useCase = new ListActivityLogUseCase(repo);

    const result = await useCase.execute({ page: 1, pageSize: 2 });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.items).toHaveLength(2);
      expect(result.value.total).toBe(5);
      expect(result.value.items[0]?.createdAt).toEqual(new Date(2026, 0, 5));
    }
  });
});
