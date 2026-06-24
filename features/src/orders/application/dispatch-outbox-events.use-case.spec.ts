import { describe, expect, it } from 'vitest';
import type { OutboxDispatcher } from '../domain/outbox';
import { DispatchOutboxEventsUseCase } from './dispatch-outbox-events.use-case';

class FakeOutboxDispatcher implements OutboxDispatcher {
  lastLimit: number | undefined;
  result = { dispatched: ['evt-1', 'evt-2'], failed: ['evt-3'] };

  async dispatchPending(limit?: number): Promise<{ dispatched: string[]; failed: string[] }> {
    this.lastLimit = limit;
    return this.result;
  }
}

describe('DispatchOutboxEventsUseCase', () => {
  it('delega en el dispatcher y devuelve el resumen de despacho', async () => {
    const dispatcher = new FakeOutboxDispatcher();
    const useCase = new DispatchOutboxEventsUseCase(dispatcher);

    const result = await useCase.execute(50);

    expect(dispatcher.lastLimit).toBe(50);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.dispatched).toEqual(['evt-1', 'evt-2']);
      expect(result.value.failed).toEqual(['evt-3']);
    }
  });
});
