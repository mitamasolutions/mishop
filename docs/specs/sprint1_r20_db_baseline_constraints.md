# Sprint 1 · r20 — Baseline DB y constraints

> Estado: 🟡 parcial · Origen: PLAN_REFORCE_100 Fase 2 + PENDIENTES Fase 2 · Hito: F2
> Alcance transversal: `packages/db/prisma/schema/*` + migraciones

## Resumen

Alinear las migraciones con el schema del MVP, eliminar la dependencia de
`prisma db push` y endurecer la integridad: baseline limpio, FKs en entidades
críticas, CHECK constraints de estados y montos, e índices únicos parciales.
Desarrollo usa `migrate dev`/`db:reset`; CI/producción usa `migrate deploy`.

## Objetivo

Que `git clone && yarn install && docker compose up -d && yarn db:migrate &&
yarn db:seed` deje una DB lista, sin `db push`, y que sea imposible crear
inconsistencias estructurales (doble orden por carrito, `reservedQuantity`
negativo, etc.).

## Requisitos / estado entregado

- **Baseline limpio** en
  `packages/db/prisma/schema/migrations/20260614000000_baseline/migration.sql`;
  las migraciones históricas de fase inicial fueron retiradas del árbol.
- **FKs críticas** declaradas en el baseline:
  - `Order.customerId` → `Customer.id`.
  - `Order.cartId` → `Cart.id` con **unique por tienda** (impide doble orden por
    carrito).
  - `Payment.orderId` → `Order.id`.
  - `Shipment.orderId` → `Order.id`.
  - `Cart.customerId`, `Cart.lines.variantId/productId`.
- **CHECK de estados** (migración `20260614020000_state_checks_and_partial_unique`):
  `Order.status/paymentStatus/channel`, `Payment.status`, `PaymentRefund.status`,
  `PaymentWebhookEvent.status`, `Cart.status/checkoutStep/channel`,
  `Shipment.status`, `StorePaymentMethod.captureMode`, `ProductReview.status`,
  `OrderStateTransition.kind`.
- **CHECK de cantidades/montos** (migración `20260614010000_check_constraints`):
  `reservedQuantity >= 0`, `incomingQuantity >= 0`, `stockedQuantity >= 0`,
  `reservedQuantity <= stockedQuantity`; montos/cantidades no negativos en
  `orders`, `order_lines`, `cart_lines`, `stock_reservations`, `payments`,
  `payment_refunds`, `prices`, `product_variants`, `store_shipping_methods`;
  `product_reviews.rating BETWEEN 1 AND 5`.
- **Índices únicos parciales** (SQL manual): `user_store_roles(user_id, role_id)
  WHERE store_id IS NULL`; `settings(key) WHERE store_id IS NULL`.

## Pendiente

- **Handles/SKUs únicos solo entre filas activas** (`deleted_at IS NULL`):
  `Product.handle` y `ProductVariant.sku`. Hoy `@unique` full → un soft-delete
  bloquea reutilizar el handle. Migrar a
  `CREATE UNIQUE INDEX ... WHERE deleted_at IS NULL` y remover el `@unique` del
  schema Prisma. (Relacionado con [[sprint1_r8_catalog]].)
- **`PaymentWebhookEvent` con `storeId` en la unicidad** `(storeId, providerCode,
  eventId)`: agregar columna `store_id`, derivar `storeId` desde `paymentId` en
  `HandlePaymentWebhookUseCase` antes de `claimOrLoadEvent`, migrar el
  `@@unique([providerCode, eventId])` a uno por tienda. (Relacionado con
  [[sprint1_r14_payments]].)
- **`TaxRule.rate >= 0`** cuando se modele la tabla de impuestos. (Relacionado
  con [[sprint1_r16_taxes]].)

## Criterios de aceptación

- [ ] `git clone && yarn install && docker compose up -d && yarn db:migrate &&
      yarn db:seed` deja una DB lista, sin `db push`.
- [ ] En CI: Postgres real + `migrate deploy` + seed + tests verdes.
- [ ] No es posible crear dos órdenes para el mismo carrito; ni dejar
      `reservedQuantity` negativo.
- [ ] Soft-delete + alta nueva con mismo handle/SKU funciona (tras el pendiente).
- [ ] Dos tiendas pueden recibir webhooks con el mismo `eventId` sin colisión
      (tras el pendiente).

## Estado

**Entregado:** baseline limpio, FKs críticas, CHECK de estados y montos, índices
parciales de settings/roles. **Pendiente:** índices parciales handle/sku,
`storeId` en unicidad de webhooks, `TaxRule.rate >= 0`.

> Nota de entorno: en la dev DB `mishop` (en drift) usar `prisma db push`; ver
> memoria del proyecto sobre migraciones vs push.
