# Sprint 1 · r18.1 — Release de gift card en cancelación/reembolso

> Estado: ✅ entregado · Origen: `fase-05-correcciones-pendientes` (sección C, hallazgo #7) · Hito: F0
> Continuación de [[sprint1_r18_giftcards]] · Módulo: `packages/modules/giftcards`

## Resumen

Restituye el saldo de una gift card (release) cuando la orden asociada se
**cancela** o se **reembolsa**, alimentado por eventos de `orders`. Alcance
acotado a release: **no** se reescribe el flujo a reserve→commit (eso queda para
una integración de checkout posterior).

## Decisiones de diseño

- **Integración gift card:** alcance acotado a **release** (restituir saldo) en
  `order.cancelled`/`order.refunded`.
- Idempotencia de la restitución vía columna `reversedAt` (no restituir dos
  veces).

## Alcance / tareas

### Schema (`giftcards.prisma`)
- `GiftCardRedemption`: añadir `reversedAt DateTime?` (guarda de idempotencia).

### Puerto (`domain/gift-card.repository.ts`)
- Añadir `findActiveRedemptionsByOrder(storeId, orderId)`.
- Añadir `releaseRedemption({ redemptionId, giftCardId, expectedVersion,
  restoredAmount, newStatus })`.

### Adapter Prisma
- `releaseRedemption` en `$transaction`:
  - `updateMany` sobre `GiftCardRedemption` con `where: { id, reversedAt: null }`
    seteando `reversedAt` → si `count !== 1`, ya se revirtió (idempotente, salir).
  - `updateMany` sobre `GiftCard` con guarda `version` incrementando `balance` por
    `restoredAmount` y recomputando `status` (`depleted`→`active` si `balance > 0`);
    `count !== 1` → conflicto → reintento acotado.
  - Reusa el patrón version-guard ya implementado.

### Caso de uso (`ReleaseGiftCardForOrderUseCase`)
- Busca redenciones activas por orden y libera cada una (bucle de reintento como
  `RedeemGiftCardUseCase`).

### Handler de eventos (`infra/order-events.handler.ts`)
- Suscribe `order.cancelled` y `order.refunded` → ejecuta el release.

### Wiring (`giftcards.module.ts`)
- Proveer handler (con `EVENT_BUS`) y use case.

## Reglas de negocio

- El release es **idempotente**: re-emitir el evento no restituye saldo dos veces
  (guardado por `reversedAt`).
- Release concurrente con otra operación respeta el **version-guard** de
  `GiftCard`.

## Criterios de aceptación

- [ ] Redención parcial + `order.cancelled` restituye el saldo exacto.
- [ ] Re-emitir el evento no duplica la restitución (idempotente vía `reversedAt`).
- [ ] Release concurrente con otra operación respeta el version-guard.

## Estado

**Entregado:** `reversedAt` en `GiftCardRedemption`, puerto extendido, adapter
Prisma con release idempotente y version-guard, `ReleaseGiftCardForOrderUseCase`,
handler suscrito a `order.cancelled`/`order.refunded`, wiring en
`giftcards.module.ts`. Depende del enriquecimiento de eventos de orden con
`productIds` (ver [[sprint1_r19.1_reviews_verified_purchase]], tarea A común).
