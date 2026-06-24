/**
 * Wiring del scheduler con los handlers reales del MVP (r24 · sprint1_cierre).
 *
 * Cada módulo expone sus use cases idempotentes; aquí los conectamos al
 * `ScheduledTaskRegistry` global por el `type` que la fila `scheduled_tasks`
 * de DB referencia. La capa de composición (apps/api) es el único lugar
 * donde los módulos se cruzan.
 */
import { Inject, Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import {
  DispatchOutboxEventsUseCase,
  DrainEmailQueueUseCase,
  ReleaseExpiredReservationsUseCase,
  ScheduledTaskRegistry,
  SCHEDULED_TASKS_TOKENS,
} from '@mitama/features';

@Injectable()
export class ScheduledTaskHandlersWiring implements OnApplicationBootstrap {
  constructor(
    @Inject(SCHEDULED_TASKS_TOKENS.registry) private readonly registry: ScheduledTaskRegistry,
    private readonly dispatchOutbox: DispatchOutboxEventsUseCase,
    private readonly drainEmailQueue: DrainEmailQueueUseCase,
    private readonly releaseExpiredReservations: ReleaseExpiredReservationsUseCase,
  ) {}

  onApplicationBootstrap(): void {
    this.registry.register({
      type: 'dispatch-outbox',
      description: 'Despacha eventos pendientes del outbox transaccional al EventBus',
      run: async () => {
        const result = await this.dispatchOutbox.execute();
        if (result.isErr()) return { ok: false };
        const value = result.value;
        return { ok: value.failed.length === 0, message: `dispatched=${value.dispatched.length} failed=${value.failed.length}` };
      },
    });
    this.registry.register({
      type: 'drain-email-queue',
      description: 'Drena la cola de emails transaccionales con reintentos y backoff',
      run: async () => {
        const result = await this.drainEmailQueue.execute();
        return { ok: result.failed.length === 0, message: `sent=${result.sent.length} retried=${result.retried.length} failed=${result.failed.length}` };
      },
    });
    this.registry.register({
      type: 'release-expired-reservations',
      description: 'Libera reservas de stock con expiresAt vencido',
      run: async () => {
        const result = await this.releaseExpiredReservations.execute();
        if (result.isErr()) return { ok: false };
        return { ok: true, message: `released=${result.value.length}` };
      },
    });
  }
}
