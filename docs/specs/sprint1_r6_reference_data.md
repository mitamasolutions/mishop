# Sprint 1 · r6 — Datos de referencia (reference-data)

> Estado: ✅ entregado · Origen: `f1-auth-stores-settings-activity-log` · Hito: F1
> Módulo: `packages/modules/reference-data`

## Resumen

Catálogo de solo lectura de países, monedas y proveedores de pago, cargado por
seed (datos estilo Medusa) con soft delete. Base geográfica/monetaria sobre la
que se construyen tiendas, regiones, envíos e impuestos. La extensión editable
de regiones/territorios/zonas vive en [[sprint1_r7_regions_territories_zones]].

## Historia de usuario

> Como plataforma, quiero un catálogo confiable de países, monedas y proveedores
> de pago cargado por seed, para que tiendas, regiones y checkout se apoyen en
> datos de referencia consistentes.

## Alcance

**Dentro:**
- Tablas `currency`, `region` (base readonly) y `country`, con soft delete.
- Endpoints de solo lectura (listado y detalle) que excluyen `deleted_at`.
- Catálogo sembrado de **proveedores de pago** (selección, no creación).
- Datos cargados por seed desde CSV estilo Medusa.

**Fuera:**
- CRUD de admin para country/region/currency (la edición de Región vive en r7).
- Creación de nuevos proveedores de pago o integración de sus pasarelas.

## Requisitos funcionales

1. Tablas `currency` (code, symbol, symbol_native, decimal_digits, rounding,
   name), `region` (id, name, currency_code, automatic_taxes) y `country`
   (iso_2, iso_3, num_code, name, display_name, region_id opcional), con
   `created_at` / `updated_at` / `deleted_at` (soft delete).
2. Endpoints de **solo lectura** (listado y detalle) que excluyen registros con
   `deleted_at`. Los datos se cargan por seed desde los CSV provistos.
3. Catálogo **sembrado de proveedores de pago** (p. ej. Stripe, Mercado Pago,
   PayPal, transferencia, efectivo); la API solo permite seleccionarlos, no
   crearlos. Existe `GET /payment-providers`; el seed carga 7 providers.

## Reglas de negocio

- Los datos de referencia son **catálogo global**, no scoped por tienda.
- Soft delete: los registros con `deleted_at` se excluyen de los listados.

## Asunciones

- Country/region/currency desde CSV estilo Medusa, solo lectura, con soft delete.
- Datos de referencia en módulo propio `reference-data`.
- Los proveedores de pago son un catálogo predefinido y sembrado.

## Criterios de aceptación

- [ ] Los endpoints de country/region/currency devuelven los datos del seed y
      excluyen registros con `deleted_at`.
- [ ] `GET /payment-providers` devuelve el catálogo sembrado.
- [ ] El seed es idempotente (correrlo dos veces no duplica datos).

## Estado

**Entregado:** módulo `reference-data` completo (countries, currencies, regions,
territories, zones, payment-providers) con adapters Prisma + in-memory y 26 casos
de uso. Sirve de andamiaje para Fase 4 (pagos/envíos/impuestos). El seed carga
los 7 payment providers.
