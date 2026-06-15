# Sprint 1 · r9 — Inventario (inventory)

> Estado: ✅ entregado · Origen: `f3-products-inventories` + PLAN_REFORCE F4 · Hito: F4 (Inventario correcto)
> Módulo: `packages/modules/inventory`

## Resumen

Stock modelado **por ubicación** (nunca como contador global), con niveles
`stocked`/`reserved`/`incoming`, backorder y umbral de stock bajo por variante.
Las reservas se crean al confirmar checkout y se consumen/liberan de forma
atómica (claim-then-apply) para garantizar consistencia ante carreras. Equivale
al inventario desacoplado estilo Medusa.

## Historia de usuario

> Como administrador, quiero gestionar stock por ubicación con reservas
> consistentes, para que nunca se sobrevenda el último ítem ni queden reservas
> colgadas, ni al pagar, ni al cancelar, ni por expiración.

## Alcance

**Dentro:**
- `inventory_item` por variante (1–1, `required_quantity` = 1 fijo, preparado
  para bundles sin migrar) + niveles por ubicación con
  `stocked`/`reserved`/`incoming`.
- Backorder y umbral de stock bajo **por variante**.
- Ajuste manual, consulta de niveles y listado/alerta de productos bajo umbral.
- Reservas transaccionales con bloqueo optimista (consumidas por `cart`/`orders`).
- `release()`/`consume()`/`releaseExpired()` con claim-then-apply.

**Fuera:**
- Bundles/kits en la UI (esquema preparado).
- Métricas/observabilidad estructurada de reservas (no bloqueante MVP).

## Requisitos funcionales

1. El stock se modela **por ubicación**: cada variante se asocia a un
   `inventory_item` (1–1, `required_quantity` = 1), y el stock vive en niveles
   por ubicación con `stocked`, `reserved` e `incoming`.
2. Por variante se configura **backorder** (permitir vender sin stock, no
   bloquea) y **umbral de stock bajo** (solo alerta visual, no bloquea ventas).
3. La UI permite **ajuste manual** de stock por ubicación, consulta de niveles y
   un listado/alerta de productos bajo umbral.
4. **Reserva de stock al confirmar checkout** (creación de orden), no al agregar
   al carrito; transaccional con **bloqueo optimista** sobre el inventario por
   ubicación.
5. **Expiración de reservas** (~15 min con pago pendiente); si el pago no se
   autoriza en plazo, la reserva se **libera automáticamente**.
6. **Transición reserva → consumo:** `payment.paid` consume la reserva
   (decrementa `stockedQuantity` y `reservedQuantity` en la misma cantidad);
   `payment.failed`/`voided`/`cancelled` liberan.
7. `release()` y `consume()` usan **claim-then-apply** sobre `stock_reservations`:
   cada reserva se reclama atómicamente (`UPDATE ... WHERE releasedAt IS NULL`) y
   solo el ganador aplica el efecto sobre `inventory_levels`.
8. `releaseExpired(now)` libera todas las reservas con `expiresAt <= now`,
   expuesto vía `POST /orders/maintenance/release-expired-reservations`
   (`orders.update`) para job periódico externo.

## Reglas de negocio

- El stock se descuenta del inventario por **ubicación**, nunca de un contador
  global por producto.
- El umbral de stock bajo **no** bloquea ventas; solo alerta. El backorder
  permite vender en negativo cuando está activo.
- Constraints DB: `reservedQuantity >= 0`, `incomingQuantity >= 0`,
  `stockedQuantity >= 0`, `reservedQuantity <= stockedQuantity`.

## Asunciones

- Inventario desacoplado estilo Medusa: `inventory_item` ↔ variante (1–1) +
  `inventory_level` por ubicación.
- Backorder y umbral de stock bajo por variante.
- Reservas al confirmar checkout, transaccionales con bloqueo optimista.
- Reservas con expiración (~15 min) y liberación automática.

## Criterios de aceptación

- [ ] Registrar stock por ubicación con `stocked`/`incoming`, activar backorder y
      fijar umbral por variante.
- [ ] El listado bajo umbral muestra las variantes por debajo, sin impedir venta.
- [ ] **E2E:** con stock = 1 y N reservas concurrentes, gana exactamente una.
- [ ] Pago `paid` consume stock; cancelación libera; expiración libera.
- [ ] No se observa nunca `reservedQuantity < 0`.
- [ ] Venta/stock negativo sin backorder → no permitido; con backorder activo, el
      nivel queda en negativo.

## Estado

**Entregado:** módulo `inventory` con 22 casos de uso, adapters Prisma,
claim-then-apply en `release`/`consume`, `releaseExpired`, constraints en el
baseline DB. La transición reserva→consumo la dispara `PaymentEventsHandler`.
Cubre el hito F4. Pantalla admin de bajo stock y ubicaciones presente.

**Pendiente (no bloqueante MVP):** métricas/logs estructurados de reservas
creadas/liberadas/consumidas (contador + duración; sink Pino/Prometheus) — ver
[[sprint1_r24_outbox_worker_observability]]. Paginado real en
`/inventario/bajo-stock` (hoy `pageSize: 100`) — ver
[[sprint1_r23_admin_operativo]].
