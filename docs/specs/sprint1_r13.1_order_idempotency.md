# Sprint 1 · r13.1 — Idempotencia robusta en creación de órdenes

> Estado: ✅ entregado · Origen: `f3-fix-idempotencia-ordenes` · Hito: F3 (Checkout)
> Continuación de [[sprint1_r13_orders]] · Módulo: `packages/modules/orders`

## Resumen

Reordena las validaciones de `CreateOrderUseCase` para que un reintento con la
misma `Idempotency-Key` devuelva la **orden original** en lugar de un error.
Restaura la garantía de idempotencia que la plataforma promete como base del sync
offline del POS y como molde de los webhooks de pago (ver
[[sprint1_r14_payments]]).

## Historia de usuario

> Como consumidor de la API que reintenta una compra (web o POS), quiero que al
> reenviar `POST /orders` con la misma `Idempotency-Key` reciba la orden ya
> creada, para no duplicar órdenes ni stock cuando un timeout de red me obliga a
> reintentar.

## Alcance

**Dentro:**
- Reordenar la lógica para que el lookup de idempotencia ocurra **antes** de la
  validación de "carrito listo".
- Resolver el `storeId` desde el carrito en **cualquier** estado.
- Test unitario (adapters in-memory) que cubra replay y conflicto.

**Fuera:**
- Concurrencia real de dos peticiones simultáneas con la misma clave (carrera).
- Webhooks de pago de Fase 4 (esta corrección solo deja el patrón de referencia).
- Cambios en endpoints, DTOs, TTL o esquema de BD.

## Requisitos funcionales

1. Consultar la existencia de la `Idempotency-Key` registrada **antes** de validar
   que el carrito esté "listo para confirmar".
2. Si existe registro para la clave y el payload coincide, devolver la **orden
   original** asociada, sin crear orden nueva ni reservar stock de nuevo.
3. Para buscar la clave —indexada por `(storeId, Idempotency-Key)`— resolver el
   `storeId` cargando el carrito por su id en **cualquier** estado.
4. Si existe registro pero el payload difiere (distinto `cartId`), responder con
   el **error de conflicto** de idempotencia existente, sin crear orden.
5. Si la clave no existe y el carrito no está listo, mantener el error actual de
   "carrito no está listo".
6. La `Idempotency-Key` sigue siendo **obligatoria**; su ausencia mantiene el
   error actual.
7. La representación devuelta en un replay es **idéntica** a la original (mismo
   número de orden, totales y estados), sin recálculos.

## Reglas de negocio

- Misma clave y mismo payload = resultado original sin re-ejecutar (ni nueva
  orden, ni nueva reserva, ni nuevo email, ni nuevo evento).
- Alcance de unicidad: `(storeId, Idempotency-Key)`.
- Clave expirada (según TTL vigente) se trata como inexistente.
- Carrito ya consumido no es, por sí solo, motivo de error si la petición es un
  replay legítimo de la clave que lo ordenó.

## Asunciones

- El lookup de idempotencia se mueve antes de la validación de carrito-listo.
- El `storeId` se resuelve cargando el carrito por id en cualquier estado.
- Clave única por tienda; conflicto por payload distinto reutiliza el error
  existente.
- El TTL de idempotencia vigente no cambia.
- Cambio acotado a `order-use-cases.ts` + un test unitario in-memory.

## Criterios de aceptación

- [ ] Reintentar `POST /orders` con la misma clave y `cartId`, tras ordenar el
      carrito, devuelve la **misma** orden (mismo id y `orderNumber`) y no
      incrementa el conteo.
- [ ] El replay no genera una segunda reserva de stock.
- [ ] Misma clave, distinto `cartId` → error de conflicto, sin crear orden.
- [ ] Clave no registrada + carrito no listo → error "carrito no está listo".
- [ ] `POST /orders` sin `Idempotency-Key` sigue devolviendo el error de header
      obligatorio.
- [ ] Existe test unitario in-memory que cubre replay exitoso y conflicto por
      payload distinto.

## Estado

**Entregado:** `CreateOrderUseCase` consulta la `Idempotency-Key` al inicio
(resolviendo `storeId` desde el carrito en cualquier estado) antes de validar
carrito-listo; replay devuelve la orden original sin doble reserva. Verificado.
Es el molde de los webhooks de pago (Fase 4).
