# Sprint 1 · r19.1 — Compra verificada por proyección de eventos (boundary fix)

> Estado: ✅ entregado · Origen: `fase-05-correcciones-pendientes` (secciones A, B, D; hallazgos #8, #9) · Hito: F0
> Continuación de [[sprint1_r19_reviews]] · Módulos: `reviews`, `orders`, `contracts`

## Resumen

`reviews` derivaba la "compra verificada" leyendo **directamente las tablas
Prisma de `orders`** (`prisma-verified-purchase.reader.ts`), violando el boundary
entre módulos (CLAUDE.md regla 2/3) y contando órdenes reembolsadas. Esta
corrección alimenta una **proyección local en `reviews`** por eventos de
`orders`, en lugar de consultar su esquema. Incluye el enriquecimiento de eventos
de orden con `productIds` (también consumido por [[sprint1_r18.1_giftcard_release]]).

## Decisiones de diseño

- **Política ante reembolso/cancelación:** una orden reembolsada o cancelada
  **revoca** la elegibilidad de review para sus productos (intención de #9). Si el
  cliente tiene **otra** orden válida con el mismo producto, sigue verificado (por
  eso la proyección se keyea por `orderId`).

## Tareas

### A. Enriquecer eventos de orden con `productIds`
Archivos: `packages/contracts/src/orders/events.ts`,
`packages/modules/orders/src/application/order-use-cases.ts`.
- `OrderEventPayload`: añadir `productIds: string[]` (lista dedup de `productId`).
- `eventPayload(order)`: incluir
  `productIds: [...new Set(order.lines.map((l) => l.productId))]`.
- Campo aditivo; no cambia suscriptores existentes.

### B. Reviews: proyección de compra verificada por eventos (#8, #9)
Archivos: `packages/db/prisma/schema/reviews.prisma`,
`packages/modules/reviews/src/...`.
- **Schema:** nueva tabla `VerifiedPurchase` (`id`, `storeId`, `customerId`,
  `productId`, `orderId`, `createdAt`) con
  `@@unique([storeId, customerId, productId, orderId])`,
  `@@index([storeId, customerId, productId])`, `@@index([storeId, orderId])`.
- **Puerto** `domain/review.repository.ts`: reemplazar `VerifiedPurchaseReader`
  por `VerifiedPurchaseRepository` con `hasVerifiedPurchase(storeId, customerId,
  productId)`, `record(entries[])`, `removeByOrder(storeId, orderId)`.
- **Adapter Prisma** contra la **nueva tabla** (sin tocar `prisma.order`);
  eliminar `prisma-verified-purchase.reader.ts`.
- **Adapter in-memory** para tests.
- **Handler de eventos** `infra/order-events.handler.ts` (`OnModuleInit` +
  `eventBus.subscribe`): `order.completed` → `record()`;
  `order.refunded`/`order.cancelled` → `removeByOrder()`.
- **Wiring** `reviews.module.ts`: proveer repo, handler (con `EVENT_BUS`) y
  `CreateReviewUseCase` apuntando al nuevo puerto. `CreateReviewUseCase` no cambia
  su lógica.

### D. Limpieza menor (no-reward)
- `markExpiredIfNeeded` (giftcards): no pisar `disabled`→`expired`; chequear
  `disabled` antes que expiración.
- `reviews` redondeo de rating: usar `roundMoney` de `@mitama/core` en lugar de
  `Math.round(x*100)/100` inline.
- `IdempotencyStore` de `@mitama/core`: adoptarse o documentarse/eliminarse
  (decisión menor; default: dejar nota y no bloquear).

## Reglas de negocio

- Una orden reembolsada/cancelada revoca la elegibilidad de review para sus
  productos; otra orden válida con el mismo producto la mantiene (keyeada por
  `orderId`).
- `reviews` ya **no** importa nada de `orders` (boundary limpio).

## Criterios de aceptación

- [ ] `order.completed` proyecta compra verificada → `CreateReview` pasa.
- [ ] `order.refunded` la revoca → `CreateReview` falla.
- [ ] Un segundo pedido válido del mismo producto mantiene la verificación.
- [ ] `disabled` no se convierte en `expired`; rating usa `roundMoney`.
- [ ] `yarn lint` confirma que `reviews` no importa de `orders`.

## Estado

**Entregado:** tabla `VerifiedPurchase`, puerto `VerifiedPurchaseRepository`,
adapters Prisma + in-memory, handler de eventos de orden, wiring en
`reviews.module.ts`; `OrderEventPayload.productIds` añadido. Boundary limpio
verificado por lint. La tarea A (eventos con `productIds`) es compartida con
[[sprint1_r18.1_giftcard_release]].
