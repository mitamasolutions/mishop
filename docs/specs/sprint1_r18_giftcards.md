# Sprint 1 · r18 — Gift cards (giftcards) [congelado]

> Estado: 🧊 congelado · Origen: `fase-05-marketing-promociones` · Hito: F0 (alcance congelado)
> Módulo: `packages/modules/giftcards`

## Resumen

Gift cards que actúan como **método de pago** (reducen el total a pagar, no el
subtotal), con emisión, saldo, redención parcial, estados y expiración.
**Construido a nivel dominio + API pero NO integrado al checkout del MVP.** La
restitución de saldo al cancelar/reembolsar se detalla en
[[sprint1_r18.1_giftcard_release]].

## Historia de usuario

> Como comerciante, quiero emitir gift cards con saldo y redención parcial, para
> que mis clientes paguen parte o todo de su orden con ellas.

## Alcance

**Dentro (backend, congelado):**
- Emisión (por admin y/o como producto), saldo inicial, código único.
- Gift card como método de pago con redención parcial.
- Estados (activa, agotada, expirada, deshabilitada) y expiración opcional.
- Coincidencia de moneda con la orden.

**Fuera del MVP:**
- Integración al checkout.
- Admin UI; sistema de diseño/plantillas; entrega por email; transfer/sharing.

## Requisitos funcionales

1. **Emitir** gift cards (por admin y/o como producto comprado) con saldo inicial
   y **código único**.
2. Una gift card actúa como **método de pago**: reduce el **total a pagar** de la
   orden, no el subtotal.
3. **Redención parcial**: el saldo restante queda disponible para compras
   futuras.
4. **Expiración opcional** y **estado**: activa, agotada, expirada o
   deshabilitada.
5. La **moneda** de la gift card debe coincidir con la de la orden para
   redimirse.

## Reglas de negocio

- Gift cards sobre el **total a pagar** (no el subtotal).
- Códigos normalizados (mayúsculas, sin espacios), comparación case-insensitive.
- Vigencia y estado: expirada/agotada/deshabilitada → no redimible.
- **Coincidencia de moneda:** gift card y orden deben compartir moneda.
- Aislamiento por tienda: ninguna gift card cruza `storeId`.
- Idempotencia: redenciones bajo la misma `Idempotency-Key` devuelven el
  resultado original.

## Asunciones

- Las gift cards las emite el admin y/o se compran como producto; funcionan como
  método de pago con redención parcial, expiración opcional y estados; su moneda
  debe coincidir con la de la orden.

## Criterios de aceptación

- [ ] Emitir una gift card con saldo, redimirla parcialmente y confirmar que el
      saldo restante queda disponible.
- [ ] Una gift card expirada, agotada o deshabilitada no se puede redimir.
- [ ] Una gift card en moneda distinta a la de la orden es rechazada.
- [ ] Gift card con saldo menor al total → redención parcial; el resto con otro
      método de pago.
- [ ] Redención repetida con misma `Idempotency-Key` no duplica el descuento de
      saldo.

## Estado

**Construido (congelado):** entidades `GiftCard`, `GiftCardRedemption`; casos de
uso `IssueGiftCard`, `RedeemGiftCard`, `DisableGiftCard`; idempotencia de
redención; redención parcial; version-guard en el adapter Prisma. Tests verdes.

**Entregado adicional:** restitución de saldo en cancelación/reembolso — ver
[[sprint1_r18.1_giftcard_release]].

**Pendiente (Sprint futuro):** integración al checkout, enforcement de expiración
por job, plantillas/entrega por email, Admin UI.
