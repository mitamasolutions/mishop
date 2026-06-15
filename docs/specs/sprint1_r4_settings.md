# Sprint 1 · r4 — Settings tipados (settings)

> Estado: ✅ entregado · Origen: `f1-auth-stores-settings-activity-log` · Hito: F1
> Módulo: `packages/modules/settings`

## Resumen

Configuración tipada en dos niveles (global y override por tienda) con catálogo
de claves válidas definido en código y cache en memoria invalidada por evento.
Equivale a Settings de nopCommerce.

## Historia de usuario

> Como super admin, quiero ajustar configuraciones globales y sobreescribir
> algunas por tienda, para adaptar el comportamiento de la plataforma sin tocar
> código, con lecturas rápidas y consistentes.

## Alcance

**Dentro:**
- Settings tipados (string, number, boolean, json) con catálogo de claves en
  código.
- Dos niveles: valor global y override opcional por tienda.
- Cache en memoria por proceso, invalidada por evento.
- Admin: CRUD de settings.

**Fuera:**
- Claves arbitrarias por API (catálogo cerrado en código).

## Requisitos funcionales

1. Settings tipados (string, number, boolean, json) con catálogo de claves
   válidas definido en código; **no** se crean claves arbitrarias por API.
2. Dos niveles: valor **global** y **override** opcional por tienda. Al leer una
   clave en contexto de tienda, el override de la tienda gana sobre el global.
3. Cache en memoria por proceso, invalidada por el evento **`settings.updated`**
   publicado en el EventBus de `@mitama/core`.

## Reglas de negocio

- Escribir un setting con tipo incorrecto o clave fuera del catálogo es
  rechazado.
- El override por tienda gana sobre el valor global al leer en contexto de esa
  tienda; sin override se devuelve el global.

## Asunciones

- Settings tipados con catálogo en código; override por tienda gana al global.
- Cache de settings en memoria por proceso, invalidada por `settings.updated`.

## Criterios de aceptación

- [ ] Un override de setting por tienda gana sobre el valor global al leer en
      contexto de esa tienda; sin override se devuelve el global.
- [ ] Tras actualizar un setting, el evento `settings.updated` invalida la cache
      y la siguiente lectura devuelve el valor nuevo.
- [ ] Escribir un setting con tipo incorrecto o clave fuera del catálogo es
      rechazado.

## Estado

**Entregado:** módulo `settings` con adapters Prisma + in-memory, lectura
global/override y cache invalidada por evento. Consumido por checkout para
shipping/taxes config (`StoreShippingMethod`, `StoreTaxSetting`).

**Pendiente:** ampliar la pantalla de configuración del admin (hoy básica) con
shipping/taxes/promotions — ver [[sprint1_r23_admin_operativo]].
