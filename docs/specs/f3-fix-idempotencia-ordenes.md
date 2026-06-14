# Idempotencia robusta en la creación de órdenes

## Resumen
Corrige el orden de validaciones en la creación de órdenes para que un reintento
con la misma `Idempotency-Key` devuelva la orden original en lugar de un error.
Restaura la garantía de idempotencia que la plataforma promete como base del
sync offline del POS y como molde de los futuros webhooks de pago (Fase 4).

## Historia de usuario
> Como consumidor de la API que reintenta una compra (web o POS), quiero que al
> reenviar `POST /orders` con la misma `Idempotency-Key` reciba la orden ya
> creada, para no duplicar órdenes ni stock cuando un timeout de red me obliga a
> reintentar.

## Alcance
**Dentro:**
- Reordenar la lógica de `CreateOrderUseCase` para que el lookup de idempotencia
  ocurra antes de la validación de "carrito listo".
- Resolver el `storeId` necesario para el lookup desde el carrito en cualquier
  estado.
- Test unitario (adapters in-memory, sin Prisma ni Nest) que cubra el replay y
  el conflicto.

**Fuera:**
- Concurrencia real de dos peticiones simultáneas con la misma clave (carrera).
- Webhooks de pago de Fase 4 (esta corrección solo deja el patrón de referencia).
- Cambios en endpoints, DTOs o contratos HTTP.
- Cambios en el TTL de idempotencia o en el esquema de base de datos.

## Requisitos funcionales
1. El sistema debe consultar la existencia de la `Idempotency-Key` registrada
   **antes** de validar que el carrito esté en estado "listo para confirmar".
2. Si existe un registro de idempotencia para la clave y el payload coincide, el
   sistema debe devolver la orden original asociada, sin crear una orden nueva ni
   reservar stock nuevamente.
3. Para poder buscar la clave —que se indexa por `(storeId, Idempotency-Key)`— el
   sistema debe resolver el `storeId` cargando el carrito por su id en cualquier
   estado, no solo cuando está "listo".
4. Si existe un registro de idempotencia para la clave pero el payload difiere
   (distinto `cartId`), el sistema debe responder con el error de conflicto de
   idempotencia existente, sin crear orden.
5. Si la clave no corresponde a ningún registro previo y el carrito no está
   listo, el sistema debe mantener el error actual de "carrito no está listo".
6. La `Idempotency-Key` sigue siendo obligatoria; su ausencia mantiene el error
   actual.
7. La representación devuelta en un replay debe ser idéntica a la de la orden
   original (mismo número de orden, totales y estados), sin recálculos.

## Reglas de negocio
- Idempotencia con la misma clave y mismo payload = el resultado original se
  devuelve sin re-ejecutar (ni nueva orden, ni nueva reserva de stock, ni nuevo
  email, ni nuevo evento de dominio).
- El alcance de unicidad de la clave es por tienda: `(storeId, Idempotency-Key)`.
- Una clave expirada (según el TTL de idempotencia vigente) se trata como
  inexistente: la siguiente petición es una creación nueva.
- Un carrito ya consumido (ordenado) no es, por sí solo, motivo de error si la
  petición es un replay legítimo de la clave que lo ordenó.

## Criterios de aceptación
- [ ] Reintentar `POST /orders` con la misma `Idempotency-Key` y el mismo
      `cartId`, después de que el carrito ya fue ordenado, devuelve la **misma**
      orden (mismo id y `orderNumber`) y no incrementa el conteo de órdenes.
- [ ] El replay no genera una segunda reserva de stock (la cantidad reservada no
      cambia respecto a la primera creación).
- [ ] Reintentar con la misma clave pero distinto `cartId` devuelve el error de
      conflicto de idempotencia, sin crear orden.
- [ ] Con una clave no registrada y un carrito no listo, se mantiene el error de
      "carrito no está listo".
- [ ] `POST /orders` sin `Idempotency-Key` sigue devolviendo el error de header
      obligatorio.
- [ ] Existe un test unitario con adapters in-memory que cubre, como mínimo, el
      caso de replay exitoso y el caso de conflicto por payload distinto.

## Flujo principal
1. Llega `POST /orders` con `cartId` e `Idempotency-Key`.
2. El sistema carga el carrito por id (cualquier estado) para resolver su
   `storeId`.
3. El sistema busca un registro de idempotencia por `(storeId, Idempotency-Key)`.
4. Si lo encuentra y el payload coincide → devuelve la orden original. Fin.
5. Si lo encuentra y el payload difiere → devuelve conflicto de idempotencia. Fin.
6. Si no lo encuentra → valida que el carrito esté listo para confirmar.
7. Si está listo → numera, reserva stock, guarda la orden con su registro de
   idempotencia, marca el carrito como ordenado, publica el evento y encola el
   email. Devuelve la orden creada.
8. Si no está listo → devuelve el error de "carrito no está listo".

## Casos borde y manejo de errores
- **Replay tras carrito consumido** → devuelve la orden original (no error).
- **Misma clave, distinto cartId** → conflicto de idempotencia, sin crear orden.
- **Clave inexistente + carrito no listo** → error "carrito no está listo".
- **Carrito inexistente** → no se puede resolver `storeId`; se devuelve el error
  correspondiente a carrito no encontrado / no listo (sin crear orden).
- **Registro de idempotencia presente pero la orden referida no existe** → se
  mantiene el error de orden no encontrada existente.
- **Clave expirada por TTL** → tratada como creación nueva.
- **Sin header `Idempotency-Key`** → error de header obligatorio.

## Asunciones
- La garantía aplica a cualquier consumidor de la API que reintente (web, POS,
  retry automático), no solo a un "cliente" humano.
- El lookup de idempotencia se mueve antes de la validación de carrito-listo.
- El `storeId` se resuelve cargando el carrito por id en cualquier estado; la
  validación de "ready" queda solo en la ruta de creación nueva.
- La clave es única por tienda: `(storeId, Idempotency-Key)`.
- Conflicto por payload distinto reutiliza el error de conflicto ya existente.
- El TTL de idempotencia vigente no cambia.
- El cambio se acota a `packages/modules/orders/src/application/order-use-cases.ts`
  más un test unitario con adapters in-memory.
- Concurrencia real con la misma clave y los webhooks de pago quedan fuera de
  alcance; esta corrección solo establece el patrón de referencia.
