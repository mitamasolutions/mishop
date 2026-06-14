# Plan de corrección — Hallazgos pendientes Fase 5 (sin reward)

## Contexto

Tras cerrar #1–#4 (concurrencia/combinabilidad), quedan los hallazgos
estructurales #6–#9 del review más limpieza menor. Este plan los resuelve
**excluyendo el módulo de reward points**, que se moverá a una **fase
`loyalty` aparte** por decisión del usuario.

Raíz común de #6/#8/#9: `reviews` deriva la "compra verificada" leyendo
**directamente las tablas Prisma de `orders`**
([prisma-verified-purchase.reader.ts](packages/modules/reviews/src/infra/prisma-verified-purchase.reader.ts)),
violando el boundary entre módulos (CLAUDE.md regla 2/3) y contando órdenes
reembolsadas. La solución es alimentar una **proyección local en `reviews`
por eventos** de `orders`, en lugar de consultar su esquema. El mismo bus
resuelve #7 (release de gift card al cancelar/reembolsar).

> Entorno: DB en drift → aplicar esquema con `corepack yarn prisma db push`
> (no `migrate dev`). Ver memoria `db-drift-migrations-vs-push`.

## Alcance

**Dentro:** #7 (release gift card), #8 (boundary reviews→orders), #9 (compra
verificada cuenta reembolsos), enriquecer eventos de orden, y limpieza menor
no-reward.

**Fuera (fase `loyalty`):** #5 (canje de puntos + expiración), #10 (reverse
confía en el monto), wiring de eventos de acumulación/reversa de puntos, y el
`Math.floor` sobre float de acumulación. **No se borra** el código reward
existente en `promotions` (`Accrue/Reverse/ConfigureRewardProgram`); se deja
intacto y sin cablear a eventos, marcado como "pendiente de extraer a
`loyalty`".

## Decisiones de diseño

- **Política de compra verificada ante reembolso/cancelación:** una orden
  reembolsada o cancelada **revoca** la elegibilidad de review para sus
  productos (coincide con la intención de #9). Si el cliente tiene **otra**
  orden válida con el mismo producto, sigue verificado (por eso la proyección
  se keyea por `orderId`).
- **Integración gift card:** alcance acotado a **release** (restituir saldo) en
  `order.cancelled`/`order.refunded`. No se reescribe el flujo a
  reserve→commit; eso queda para una integración de checkout posterior.

---

## A. Enriquecer eventos de orden con `productIds`
Archivos: `packages/contracts/src/orders/events.ts`,
`packages/modules/orders/src/application/order-use-cases.ts`.

- `OrderEventPayload`: añadir `productIds: string[]` (lista dedup de
  `productId` de las líneas).
- `eventPayload(order)` (orders, ~L190): incluir
  `productIds: [...new Set(order.lines.map((l) => l.productId))]`.
- No cambia ningún suscriptor existente (campo aditivo). Verificar que los specs
  de `orders` sigan en verde.

## B. Reviews: proyección de compra verificada por eventos (#8, #9)
Archivos: `packages/db/prisma/schema/reviews.prisma`,
`packages/modules/reviews/src/...`.

- **Schema**: nueva tabla `VerifiedPurchase`:
  - campos: `id`, `storeId`, `customerId`, `productId`, `orderId`, `createdAt`.
  - `@@unique([storeId, customerId, productId, orderId])`,
    `@@index([storeId, customerId, productId])`, `@@index([storeId, orderId])`.
- **Puerto** `domain/review.repository.ts`: reemplazar `VerifiedPurchaseReader`
  por `VerifiedPurchaseRepository` con:
  `hasVerifiedPurchase(storeId, customerId, productId)`,
  `record(entries: { storeId, customerId, productId, orderId }[])`,
  `removeByOrder(storeId, orderId)`.
- **Adapter Prisma** `infra/prisma-verified-purchase.repository.ts`: implementa
  los tres métodos contra la **nueva tabla** (sin tocar `prisma.order`).
  Eliminar `prisma-verified-purchase.reader.ts`.
- **Adapter in-memory** para tests del handler/reader.
- **Handler de eventos** `infra/order-events.handler.ts` (patrón de
  [payment-events.handler.ts](packages/modules/orders/src/infra/payment-events.handler.ts),
  `OnModuleInit` + `eventBus.subscribe`):
  - `order.completed` → `record()` para cada `productId` del payload.
  - `order.refunded` y `order.cancelled` → `removeByOrder()`.
- **Wiring** `reviews.module.ts`: proveer el repo, el handler (con `EVENT_BUS`
  inyectado) y `CreateReviewUseCase` apuntando al nuevo puerto.
- `CreateReviewUseCase` no cambia su lógica: sigue llamando
  `hasVerifiedPurchase`, ahora contra la proyección.

## C. Gift card: release en cancelación/reembolso (#7)
Archivos: `packages/db/prisma/schema/giftcards.prisma`,
`packages/modules/giftcards/src/...`.

- **Schema** `GiftCardRedemption`: añadir `reversedAt DateTime?` (guarda de
  idempotencia para no restituir dos veces).
- **Puerto** `domain/gift-card.repository.ts`: añadir
  `findActiveRedemptionsByOrder(storeId, orderId)` y
  `releaseRedemption({ redemptionId, giftCardId, expectedVersion, restoredAmount, newStatus })`.
- **Adapter Prisma**: `releaseRedemption` en `$transaction`:
  - `updateMany` sobre `GiftCardRedemption` con `where: { id, reversedAt: null }`
    seteando `reversedAt` → si `count !== 1`, ya se revirtió (idempotente, salir).
  - `updateMany` sobre `GiftCard` con guarda `version` incrementando `balance`
    por `restoredAmount` y recomputando `status` (`depleted`→`active` si
    `balance > 0`); `count !== 1` → conflicto → reintento acotado.
  - Reusa el patrón version-guard ya implementado en #1.
- **Caso de uso** `ReleaseGiftCardForOrderUseCase`: busca redenciones activas
  por orden y libera cada una (bucle de reintento como `RedeemGiftCardUseCase`).
- **Handler** `infra/order-events.handler.ts` (giftcards): suscribe
  `order.cancelled` y `order.refunded` → ejecuta el release.
- **Wiring** `giftcards.module.ts`: proveer handler (con `EVENT_BUS`) y use case.

## D. Limpieza menor (no-reward)
- `markExpiredIfNeeded` ([gift-card-use-cases.ts:80](packages/modules/giftcards/src/application/gift-card-use-cases.ts#L80)):
  no pisar `disabled`→`expired`; chequear `disabled` antes que expiración y
  evitar el `save` extra en el camino de error.
- `reviews` redondeo de rating: usar `roundMoney` de `@mitama/core` en lugar de
  `Math.round(x*100)/100` inline (prisma + in-memory).
- `evaluatePromotions` ([promotion-use-cases.ts:253](packages/modules/promotions/src/application/promotion-use-cases.ts#L253)):
  añadir `findApplicableDiscounts(storeId, now)` al puerto que empuje
  active+vigencia+store al WHERE, en vez de traer todos y filtrar en memoria.
- `IdempotencyStore` de `@mitama/core`: o se adopta en estos módulos, o se
  documenta/elimina si no se usará. (Decisión menor; default: dejar nota y no
  bloquear.)
- `SubscribeNewsletterUseCase` ([:187](packages/modules/promotions/src/application/promotion-use-cases.ts#L187)):
  separar rama nuevo-vs-existente en vez de construir-y-repisar.

---

## Archivos a tocar (resumen)
- `packages/contracts/src/orders/events.ts` — `productIds` en payload.
- `packages/modules/orders/src/application/order-use-cases.ts` — emitir `productIds`.
- `packages/db/prisma/schema/{reviews,giftcards}.prisma` — tabla
  `VerifiedPurchase` + `reversedAt`.
- `packages/modules/reviews/src/{domain,infra,application}` + `reviews.module.ts`
  — puerto/proyección/handler/wiring.
- `packages/modules/giftcards/src/{domain,infra,application}` + `giftcards.module.ts`
  — release + handler + wiring.
- Specs de `reviews` y `giftcards` (nuevos casos).
- Limpieza puntual en archivos listados en D.

Patrones de referencia:
[payment-events.handler.ts](packages/modules/orders/src/infra/payment-events.handler.ts)
(handler + `OnModuleInit`), [orders.module.ts](packages/modules/orders/src/orders.module.ts)
(wiring de handler con `EVENT_BUS`), y el version-guard de
[prisma-gift-card.repository.ts](packages/modules/giftcards/src/infra/prisma-gift-card.repository.ts).

## Tests (Vitest, in-memory)
- **Reviews**: `order.completed` proyecta compra verificada → `CreateReview`
  pasa; `order.refunded` la revoca → `CreateReview` falla; un segundo pedido
  válido del mismo producto mantiene la verificación.
- **Gift card release**: redención parcial + `order.cancelled` restituye el
  saldo exacto; re-emitir el evento no duplica la restitución (idempotente vía
  `reversedAt`); release concurrente con otra operación respeta el version-guard.
- **Limpieza**: `disabled` no se convierte en `expired`; rating usa `roundMoney`.

## Verificación
1. `corepack yarn prisma db push` — crea `VerifiedPurchase` y `reversedAt`.
2. `corepack yarn build` — tipos de contracts + nuevos puertos.
3. `corepack yarn test` — specs nuevos + existentes en verde.
4. `corepack yarn lint` — confirma que `reviews` ya **no** importa nada de
   `orders` (boundary limpio).
