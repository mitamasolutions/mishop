# Sprint 1 · r19 — Reviews (reviews) [congelado]

> Estado: 🧊 congelado · Origen: `fase-05-marketing-promociones` · Hito: F0 (alcance congelado)
> Módulo: `packages/modules/reviews`

## Resumen

Reviews de producto con **compra verificada**, **moderación previa** y rating
agregado que promedia solo las aprobadas. **Construido a nivel dominio + API pero
NO integrado al checkout/storefront del MVP.** La proyección de compra verificada
por eventos (boundary fix) se detalla en
[[sprint1_r19.1_reviews_verified_purchase]].

## Historia de usuario

> Como comerciante, quiero reviews moderadas solo de clientes con compra
> verificada, para construir prueba social confiable sin spam.

## Alcance

**Dentro (backend, congelado):**
- Review solo de cliente con compra verificada del producto.
- Moderación previa (toda review entra pendiente).
- Escala 1–5; rating agregado solo de aprobadas.
- Una review por cliente y producto, editable mientras esté pendiente.

**Fuera del MVP:**
- Admin UI de moderación; storefront; email notifications.

## Requisitos funcionales

1. Solo clientes con **compra verificada** del producto pueden crear una review.
2. Toda review entra en estado **pendiente** y requiere **aprobación de un
   moderador** antes de publicarse.
3. El rating usa escala **1 a 5 estrellas**; el **rating agregado** promedia
   únicamente las reviews **aprobadas**.
4. Cada cliente puede dejar **una sola review por producto** comprado, editable
   mientras esté pendiente.

## Reglas de negocio

- **Verificación de compra:** sin una orden completada que incluya el producto,
  no se admite review.
- **Moderación previa:** ninguna review afecta el rating agregado hasta ser
  aprobada.
- Aislamiento por tienda: ninguna review cruza `storeId`.

## Asunciones

- Solo compra verificada puede dejar review; moderación previa; escala 1–5;
  rating agregado solo de aprobadas; una review por cliente y producto, editable
  mientras esté pendiente.

## Criterios de aceptación

- [ ] Un cliente sin compra verificada no puede crear una review del producto.
- [ ] Una review recién creada queda pendiente y no altera el rating agregado
      hasta ser aprobada.
- [ ] Tras aprobar reviews, el rating agregado promedia solo las aprobadas.
- [ ] Un cliente no puede crear una segunda review del mismo producto.

## Estado

**Construido (congelado):** entidades `ProductReview`, `VerifiedPurchase`; casos
de uso `CreateReview`, `UpdateReview`, `DeleteReview`, `ListReviews`. Adapters
Prisma (review, verified-purchase) + in-memory. Tests verdes.

**Entregado adicional:** la "compra verificada" ahora se alimenta por una
**proyección local** por eventos de `orders` (boundary limpio) — ver
[[sprint1_r19.1_reviews_verified_purchase]].

**Pendiente (Sprint futuro):** workflow de moderación en Admin UI, rating
aggregation expuesto en storefront, email notifications. Limpieza menor: el
redondeo de rating usa `roundMoney` de `@mitama/core` (ya aplicado en r19.1).
