/**
 * Outbox: garantiza que los eventos críticos sobreviven a caídas. Los
 * eventos se insertan en la misma transacción de DB que la mutación que
 * los genera; un worker (in-process o separado) los reclama y publica
 * al `EventBus` con reintentos controlados.
 */
import type { DomainEvent } from '@mitama/core';

export interface OutboxEventInput {
  name: string;
  payload: Record<string, unknown>;
  storeId?: string | null;
}

export interface PendingOutboxEvent {
  id: string;
  name: string;
  payload: Record<string, unknown>;
  storeId: string | null;
  attempts: number;
  maxAttempts: number;
}

export interface OutboxDispatcher {
  /**
   * Reclama eventos pendientes, los publica al `EventBus` y los marca
   * como despachados. Devuelve los ids procesados (éxito o fallo
   * terminal). Idempotente y seguro ante concurrencia.
   */
  dispatchPending(limit?: number): Promise<{ dispatched: string[]; failed: string[] }>;
}

export function toDomainEvent(event: PendingOutboxEvent): DomainEvent {
  return { name: event.name, occurredAt: new Date(), payload: event.payload };
}
