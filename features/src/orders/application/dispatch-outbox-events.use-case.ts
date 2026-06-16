import { ok, type Result, type UseCase } from '@mitama/core';
import type { OutboxDispatcher } from '../domain/outbox';

export class DispatchOutboxEventsUseCase implements UseCase<number | undefined, Result<{ dispatched: string[]; failed: string[] }, never>> {
  constructor(private readonly dispatcher: OutboxDispatcher) {}

  async execute(limit?: number): Promise<Result<{ dispatched: string[]; failed: string[] }, never>> {
    return ok(await this.dispatcher.dispatchPending(limit));
  }
}
