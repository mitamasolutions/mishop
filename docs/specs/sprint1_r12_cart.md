# Sprint 1 · r12 — Carrito y Checkout (cart)

> Estado: 🟡 parcial · Origen: `f3-ventas-customers-cart-orders` + PLAN_REFORCE F3 · Hito: F3 (Checkout server-side)
> Módulo: `packages/modules/cart`

## Resumen

Carrito server-side persistente, ligado a tienda/canal, con validación de stock y
precio vigentes; fusión de carrito invitado al iniciar sesión; expiración y
purga. El checkout es una **máquina de estados** (carrito → dirección → envío →
pago → confirmación) y el servidor es la única fuente de verdad de precios y
totales. Equivale a Shopping Cart + Checkout de nopCommerce.

## Historia de usuario

> Como comprador, quiero un carrito persistente que valide precios y stock, y un
> checkout guiado por pasos, para completar mi compra con la seguridad de que el
> precio y el stock son los vigentes al confirmar.

## Alcance

**Dentro:**
- Carrito server-side por token opaco (invitado) o `customer_id` (sesión).
- Fusión de carrito invitado al iniciar sesión; un carrito activo por
  cliente/sesión; expiración (30 días configurable) y purga.
- Carrito ligado a tienda y canal; validación de precio y stock vigentes.
- Checkout como máquina de estados con retroceso antes de confirmar.
- Métodos de envío configurables con costo (ver [[sprint1_r15_shipping]]).
- Validación server-side de carrito (expirado, variante deleted, producto no
  publicado, precio actual vs capturado).

**Fuera:**
- Aplicación de promociones/cupones/gift cards en checkout (congelado).
- UI de storefront.

## Requisitos funcionales

1. El carrito es server-side y se identifica por un **token opaco** (cookie/
   header) para invitados, o por `customer_id` cuando hay sesión.
2. Al iniciar sesión, el carrito de invitado se **fusiona** con el del cliente.
3. Existe **un carrito activo** por cliente/sesión. Los inactivos expiran a los
   **30 días** (configurable) y se purgan.
4. El carrito está ligado a una **tienda y canal**; precios y stock se resuelven
   por la ubicación/canal de esa tienda.
5. Cada línea guarda `variant_id`, cantidad y el **precio unitario capturado al
   agregar**. Los totales se recalculan en cada lectura validando precio y stock
   vigentes.
6. Si el precio vigente difiere del capturado, la línea se actualiza al vigente y
   se marca **advertencia**; el cliente debe **confirmar** antes de avanzar.
7. Si el stock disponible es menor a la cantidad, la línea se ajusta al máximo (o
   se marca sin stock) y no se permite avanzar a pago con líneas inválidas.
8. **Checkout máquina de estados:** carrito → **dirección** → **envío** → **pago**
   → **confirmación**, con retroceso a fase previa mientras no se confirme.
9. La fase de envío ofrece **métodos configurables** con su costo.
10. El pago se modela mediante un **puerto de proveedor de pago**; adapter inicial
    manual/offline.
11. **(PLAN_REFORCE F3)** `PrismaCheckoutCartReader` rechaza el checkout si el
    carrito está expirado (`expiresAt <= now`), la variante fue soft-deleted, el
    producto no está `published`, o el precio actual del `PriceSet` no coincide
    con el `currentUnitPrice` capturado (defensa anti-manipulación cliente).

## Reglas de negocio

- Un carrito pertenece a exactamente una tienda y un canal; no se mezclan
  productos de tiendas distintas.
- No se puede confirmar el checkout si alguna línea tiene precio sin confirmar o
  stock insuficiente.
- El precio y stock que valen para la orden son los **vigentes al confirmar**.
- Fusión de carritos con la misma variante → se consolidan cantidades respetando
  el stock disponible.

## Asunciones

- Carrito server-side por token (invitado) o `customer_id` (sesión), con fusión
  al iniciar sesión.
- Un carrito activo por cliente/sesión; expiración 30 días configurable y purga.
- Carrito ligado a tienda y canal.
- Cada línea captura precio al agregar; totales recalculados en cada lectura.
- Checkout máquina de estados con retroceso antes de confirmar.
- Métodos de envío configurables con costo; puerto de pago con adapter
  manual/offline inicial.

## Criterios de aceptación

- [ ] El carrito persiste entre requests y se recupera por token (invitado) o
      `customer_id` (sesión).
- [ ] Al iniciar sesión con un carrito de invitado, sus líneas se fusionan.
- [ ] Un carrito inactivo más allá del umbral deja de estar activo y es purgado.
- [ ] Si el precio de una línea cambió, el carrito lo refleja con advertencia y
      bloquea el avance hasta confirmación.
- [ ] Si el stock es insuficiente, la línea se ajusta/marca y el checkout no
      avanza a pago.
- [ ] El checkout solo pasa a la siguiente fase cuando la actual está completa, y
      permite retroceder antes de confirmar.
- [ ] Manipular `currentUnitPrice` del carrito desde el cliente no permite
      confirmar a un precio distinto del vigente.

## Estado

**Entregado (primer corte):** carrito server-side con líneas, add/remove/update,
flujo de checkout (addresses → shipping → payment → confirmation), price change
handling con confirmación, merge guest/customer, expiración + purga,
`PrismaCheckoutCartReader` con validaciones server-side. Adapters Prisma +
in-memory.

**Pendiente (F3 segundo corte):** el **recálculo total server-side** completo
(subtotal/shipping/taxes) vive en `CreateOrderUseCase` — ver
[[sprint1_r13_orders]]. Considerar mover N+1 de `PrismaCheckoutCartReader` a una
query única.
