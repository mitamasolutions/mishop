# Sprint 1 · r24 — Outbox, worker y observabilidad

> Estado: 🟡 parcial · Origen: PLAN_REFORCE_100 Fase 8 + PENDIENTES Fase 8 · Hito: F8
> Alcance transversal: `packages/modules/orders`, `apps/worker` (nuevo)

## Resumen

Que los efectos colaterales críticos (consumo de stock, emails, eventos)
sobrevivan caídas: outbox transaccional para todos los eventos críticos, un worker
dedicado en proceso separado, y observabilidad (correlation-id, `/health/worker`,
métricas).

## Entregado (primer corte)

- Schema `outbox_events` (migración `202606140003_sprint1_outbox_events`).
- Puerto `OutboxDispatcher` + `OutboxEventInput` en
  `@mitama/orders/domain/outbox.ts`.
- `OrderRepository.save()` acepta `{ idempotency, outbox }` y persiste los eventos
  en la **misma transacción** que la orden (`order.created` no se pierde).
- `PrismaOutboxDispatcher` reclama pendientes con
  `UPDATE WHERE dispatched_at IS NULL` (claim-then-publish), publica al `EventBus`
  y marca `dispatched_at`; reintentos incrementan `attempts` y guardan
  `last_error`; se detiene tras `max_attempts`.
- `DispatchOutboxEventsUseCase` + `POST /orders/maintenance/dispatch-outbox`
  (`orders.update`).
- Inline `eventBus.publish('order.created', …)` removido de `CreateOrderUseCase`.

## Pendiente

- **Outbox para el resto de eventos críticos** que hoy hacen `eventBus.publish`
  directo: `payment.paid`, `payment.refunded`, `payment.authorized`,
  `payment.voided`, `payment.failed`; `order.completed`, `order.cancelled`,
  `order.refunded`; `shipment.notification_requested`.
- **Worker dedicado** (`apps/worker`, proceso separado):
  - Loop con backoff que llama a `dispatchOutbox` + `releaseExpired` + drena
    `OrderEmailJob`.
  - Heartbeat en DB para `/health/worker`.
  - Servicio `worker` en `docker-compose.prod.yml` (ver [[sprint1_r25_cicd_deploy]]).
- **Logger Nest** con `requestId`/`correlationId` propagado vía interceptor;
  eliminar `console.log` residuales en runtime.
- **`/health/worker`** con timestamp del último heartbeat (<60s = ok; 503 si >60s).
- **Métricas mínimas** (Pino estructurado o `/metrics` Prometheus): outbox
  dispatched/failed, eventos pendientes, reservas vivas. (También cubre la
  observabilidad de reservas pendiente en [[sprint1_r9_inventory]].)

## Criterios de aceptación

- [ ] Si la API cae justo después de un `payment.paid`, el worker procesa el
      efecto (consumo de stock, email) al volver.
- [ ] Si la API cae justo después de guardar una orden, el worker procesa el
      email/eventos al volver.
- [ ] Cada request en logs lleva un `requestId` correlacionable end-to-end.
- [ ] `/health/worker` responde 503 si el heartbeat tiene más de 60s.

## Estado

**Parcial:** outbox `order.created` + dispatcher manual entregados; faltan outbox
del resto de eventos, worker dedicado y observabilidad estructurada. Prioridad #4
entre las brechas bloqueantes del Sprint 1.
