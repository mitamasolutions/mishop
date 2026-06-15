# Sprint 1 · r13 — Órdenes (orders)

> Estado: 🟡 parcial · Origen: `f3-ventas-customers-cart-orders` + PLAN_REFORCE F3/F8 · Hito: F3 (Checkout), F8 (Outbox)
> Módulo: `packages/modules/orders`

## Resumen

Creación de orden con numeración configurable por tienda, **snapshot inmutable**
de líneas y direcciones, campo `channel` (`web` | `pos`), estados de orden y pago
como **máquinas de estado separadas** con historial, y emisión de **eventos de
dominio** (vía outbox transaccional) que disparan efectos asíncronos (emails,
inventario). El servidor recalcula los totales como única fuente de verdad.
Equivale a Orders + Order Notes de nopCommerce. La idempotencia robusta se
detalla en [[sprint1_r13.1_order_idempotency]].

## Historia de usuario

> Como comprador, quiero recibir una orden confiable con precios y stock validados
> al confirmar; como administrador, quiero gestionar órdenes (estados, notas,
> reenvío, cancelación con liberación de stock) con trazabilidad completa.

## Alcance

**Dentro:**
- Orden con numeración configurable por tienda, snapshot inmutable, `channel`.
- Estado de orden y de pago como máquinas separadas con historial de
  transiciones.
- Reserva de inventario transaccional con bloqueo optimista al confirmar.
- Idempotencia vía `Idempotency-Key` (ver r13.1).
- Eventos de dominio sobre el `EventBus` con suscriptores asíncronos.
- Admin: listado/filtrado, cambio de estados, notas internas, reenvío,
  cancelación.
- Emails transaccionales base (creada, pagada, cancelada) con plantillas
  editables/versionadas y cola con reintentos.
- Outbox transaccional para `order.created`.
- Recálculo total server-side en `CreateOrderUseCase`.

**Fuera:**
- Pasarelas de pago reales (ver [[sprint1_r14_payments]]).
- Origen de órdenes desde POS (`channel: pos`): modelo soportado, flujo no
  implementado.
- Devoluciones/RMA completas.

## Requisitos funcionales

### Órdenes
1. Numeración **configurable por tienda**: prefijo + secuencia incremental
   (p. ej. `WEB-000123`), única por tienda y sin reutilizar el secuencial.
2. **Snapshot inmutable** por línea (nombre de producto/variante, SKU, precio
   unitario, impuestos, cantidad) y del total, independiente de cambios futuros
   en el catálogo.
3. Campo `channel` (`web` | `pos`); en esta fase solo se origina `web`.
4. Referencia al cliente (registrado o invitado) y snapshot de direcciones de
   envío y facturación, método de envío y método de pago.

### Estados, historial y eventos
5. **Estado de orden** máquina: `pending → confirmed → completed`, rama
   `cancelled`. Cada transición valida el estado de origen permitido.
6. **Estado de pago** máquina **separada**: `pending → authorized → paid →
   (refunded | failed)`.
7. Cada transición registra **historial**: quién, cuándo, origen → destino y
   motivo.
8. Eventos de dominio: `order.created`, `payment.authorized`, `payment.paid`,
   `order.completed`, `order.cancelled`, `order.refunded`.
9. Los eventos son la **fuente de los efectos secundarios** (emails, liberación
   de stock, futura sync POS) y se procesan **asíncronamente**.

### Recálculo server-side (PLAN_REFORCE F3)
10. `CreateOrderUseCase` actúa como **orquestador de checkout**: input mínimo del
    cliente (`cartId` + `Idempotency-Key` (+ email para guest)); el backend
    **recalcula todo**: catálogo, precio, stock, shipping, impuestos, totales.
11. Validaciones: producto publicado, variante activa, canal/tienda correctos;
    precio determinístico por `(variant, currency, list, rango)`; stock en la
    ubicación correcta; carrito vigente.
12. Cálculos: shipping desde `StoreShippingMethod`, taxes desde `StoreTaxSetting`
    + `TaxRule` por región; subtotal/tax/shipping/total en backend.
13. **Flujo atómico:** (1) reclamar idempotencia → (2) validar carrito → (3)
    reservar stock → (4) crear orden con snapshots → (5) marcar carrito
    `ordered` → (6) insertar outbox/email job.
14. Snapshot ampliado en `Order`/`OrderLine`: precio, `taxAmount` real,
    `currencyCode` por línea, `shippingMethod` resuelto, payment method,
    direcciones, email/teléfono comprador (guest).

### Admin
15. Listar y filtrar órdenes (por estado, cliente, canal, fecha, número).
16. Cambiar estado respetando transiciones válidas; cambiar estado de pago.
17. Agregar **notas internas** (no visibles para el cliente).
18. **Reenviar** el email de confirmación.
19. **Cancelar** una orden: libera el stock reservado/descontado, emite
    `order.cancelled`, solo **antes de `completed`**.

### Emails transaccionales
20. Plantillas **editables y versionadas** con variables (creada, pagada,
    cancelada).
21. Cola con **reintentos** (3 con backoff) detrás de un puerto de proveedor de
    email; adapter inicial log/SMTP.

### Outbox (PLAN_REFORCE F8)
22. `OrderRepository.save()` acepta `{ idempotency, outbox }` y persiste los
    eventos en la **misma transacción** que la orden, garantizando que
    `order.created` no se pierde. `DispatchOutboxEventsUseCase` +
    `POST /orders/maintenance/dispatch-outbox` para trigger externo.

## Reglas de negocio

- El precio y stock que valen para la orden son los **vigentes al confirmar**;
  una vez creada, su snapshot es inmutable.
- La reserva de stock se descuenta por **ubicación**, nunca global.
- Solo transiciones válidas según la máquina correspondiente; cualquier otra se
  rechaza.
- La numeración no se reutiliza aunque una orden se cancele.
- La liberación de stock al cancelar solo aplica si la orden aún tenía stock
  reservado/descontado y no estaba `completed`.

## Asunciones

- Numeración configurable por tienda (prefijo + secuencia), única y sin
  reutilizar.
- Snapshot inmutable de líneas, direcciones, envío y pago.
- Campo `channel` (`web` | `pos`); en esta fase solo `web`.
- Máquinas de estado separadas (orden y pago) con historial.
- Eventos de dominio en el `EventBus` con suscriptores asíncronos.
- Plantillas de email editables/versionadas + cola con reintentos.
- Manipular precio/total desde el cliente no altera la orden creada.

## Criterios de aceptación

- [ ] La orden se numera con prefijo + secuencia configurable por tienda, única y
      sin reutilizar.
- [ ] La orden contiene un snapshot inmutable de líneas, direcciones, envío y
      pago que no cambia ante modificaciones del catálogo.
- [ ] La orden persiste `channel = web`.
- [ ] Orden y pago solo aceptan transiciones válidas; cada transición queda en el
      historial con autor, momento, origen, destino y motivo.
- [ ] Se emiten los eventos `order.created`, `payment.authorized`, `payment.paid`,
      `order.completed`, `order.cancelled`, `order.refunded`.
- [ ] Los suscriptores reaccionan sin bloquear el request HTTP.
- [ ] El admin puede listar/filtrar, cambiar estados válidos, agregar notas,
      reenviar confirmación y cancelar.
- [ ] Cancelar libera stock y emite `order.cancelled`; cancelar una `completed`
      es rechazado.
- [ ] **Manipular precio/total desde el cliente no altera la orden creada.**
- [ ] **Dos checkouts concurrentes del mismo carrito no duplican orden ni stock.**
- [ ] Si la API cae justo tras guardar la orden, el worker procesa el evento/email
      al volver (outbox).
- [ ] **Test de carrera:** ante múltiples órdenes por el último ítem, solo una
      tiene éxito, sin sobreventa.

## Estado

**Entregado:** módulo `orders` completo a nivel núcleo — creación con
idempotencia (ver r13.1), reservas, máquinas de estado con auditoría, outbox
`order.created` transaccional + dispatcher, email queue. Unicidad
`Order(storeId, cartId)` impide doble orden por carrito
(`OrderAlreadyExistsForCartError`). Pantalla admin de Órdenes operativa
(`/ordenes`, `/ordenes/[orderId]`, `GET /orders/:orderId`).

**Pendiente (F3 segundo corte):** recálculo **total** server-side completo
(subtotal/shipping/taxes — hoy no se confía 100% en server) y snapshot ampliado
(`currencyCode` por línea, `taxAmount` real, `shippingMethod` server-side);
validar canal/tienda del producto vs carrito; paginado real en `GET /orders`
(hoy array sin total). Outbox para el resto de eventos y worker dedicado — ver
[[sprint1_r24_outbox_worker_observability]].
