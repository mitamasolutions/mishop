# Sprint 1 · r16 — Impuestos (taxes)

> Estado: 🟡 parcial · Origen: `fase-4-pagos-envios-impuestos` · Hito: F5
> Módulo: `packages/modules/taxes` · Doc relacionada: [`providers/como-escribir-un-provider.md`](providers/como-escribir-un-provider.md)

## Resumen

Categorías de impuesto por producto/variante, IVA México como reglas de tasa por
categoría+región (configurables, no hardcodeadas) y precios **con/sin impuesto
incluido** configurable por tienda. El cálculo ocurre en checkout al construir la
orden, con desglose por línea y total en `taxTotal`.

## Historia de usuario

> Como comerciante en México, quiero calcular el IVA correcto por producto y ver
> el desglose por línea, para cumplir con la fiscalidad de mi región sea que mis
> precios incluyan o no impuesto.

## Alcance

**Dentro:**
- Contrato `TaxProvider` y cálculo de desglose por línea.
- Categorías de impuesto por producto/variante: `standard` (16 %), `tasa 0 %`,
  `exento`.
- Reglas de tasa por categoría+región (configurables; México sembrada).
- Precios con/sin impuesto incluido configurable por tienda.

**Fuera:**
- CFDI / facturación electrónica ante el SAT.
- Cálculo de impuestos en navegación del catálogo (solo en checkout).
- Tax classes complejas / impuestos compuestos.

## Requisitos funcionales

1. Cada producto/variante se asocia a una **categoría de impuesto**: `standard`
   (16 %), `tasa 0 %`, `exento`.
2. El IVA México se modela como **reglas de tasa por categoría y región**
   (configurables, no hardcodeadas); el seed carga las tres tasas mexicanas.
3. Cada tienda configura si sus **precios se ingresan con impuesto incluido o sin
   impuesto** (`StoreTaxSetting`); el cálculo deriva el impuesto en consecuencia.
4. El cálculo ocurre en **checkout** al construir la orden; el desglose se guarda
   por línea (`OrderLine`) y se totaliza en `taxTotal`.

## Reglas de negocio

- Impuesto efectivo = tasa(categoría del producto, región de la tienda); `exento`
  y `tasa 0 %` producen impuesto 0 pero se **distinguen** en el desglose.
- `taxTotal` = suma de impuestos por línea; coherente con `subtotal`,
  `shippingTotal` y `total`.
- Producto sin categoría de impuesto → se aplica `standard` por defecto y se
  registra advertencia.
- Tienda sin reglas para su región → impuesto 0 con advertencia; no bloquea el
  checkout.

## Asunciones

- Categorías de impuesto por producto/variante (`standard 16 %`, `tasa 0 %`,
  `exento`); tasas por categoría+región configurables, sembradas para México.
- Precios con/sin impuesto incluido configurable por tienda; cálculo en checkout
  con desglose por línea en `taxTotal`.
- Para México, `mx-iva` usa reglas persistidas por `regionId + category`.

## Criterios de aceptación

- [ ] Una orden con productos `standard`, `tasa 0 %` y `exento` calcula `taxTotal`
      correcto y guarda el desglose por línea.
- [ ] Con "precio con impuesto incluido" activado, el total no cambia pero el
      desglose separa base e impuesto; con "sin impuesto", el impuesto se suma.

## Estado

**Entregado:** entidades `TaxRule` (por tienda) y `StoreTaxSetting`; cálculo
básico por región. Adapters Prisma + in-memory.

**Pendiente:**
- Integración completa del cálculo en el **recálculo server-side** de la orden
  (desglose por línea + `taxTotal`) — ver [[sprint1_r13_orders]].
- Tax class por producto/variante completa y reglas configurables verificadas.
- Constraint DB `TaxRule.rate >= 0` — ver [[sprint1_r20_db_baseline_constraints]].
- Pantalla admin de impuestos — ver [[sprint1_r23_admin_operativo]].
