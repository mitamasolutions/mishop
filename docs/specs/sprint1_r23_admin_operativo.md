# Sprint 1 · r23 — Admin operativo MVP

> Estado: 🟡 parcial · Origen: PLAN_REFORCE_100 Fase 6 + PENDIENTES Fase 6 · Hito: F6
> Alcance transversal: `apps/admin`

## Resumen

Poder operar una tienda real desde el admin sin tocar la DB a mano: una venta
completa gestionable end-to-end (cliente + pago + envío), con permisos que ocultan
**y deshabilitan** acciones, paginado real y dashboard con KPIs reales.

## Objetivo / criterio

- Una venta completa puede gestionarse **end-to-end** desde el admin (cliente +
  pago + envío).
- Ningún botón de mutación es visible al usuario sin el permiso.
- El dashboard ya no muestra placeholders.

## Entregado (primer corte)

- Pantalla **Órdenes**:
  - Listado en `/ordenes` con filtros por estado, estado de pago y número.
  - Detalle en `/ordenes/[orderId]`: totales, datos del cliente, líneas,
    direcciones de envío/facturación, historial de transiciones, notas internas.
  - Acciones: cambiar estado de orden, cambiar estado de pago, cancelar (con
    `Dialog`, no `window.confirm`), reenviar confirmación, agregar nota.
  - Backend: `GET /orders/:orderId`. Sidebar con entrada "Órdenes"
    (permiso `orders.read`).
  - (Ver [[sprint1_r13_orders]].)

## Pendiente

- Pantalla **Clientes** (`/clientes`): listado con búsqueda; detalle con
  addresses e historial de órdenes (filtra `customerId`). (Ver
  [[sprint1_r11_customers]].)
- Pantalla **Pagos** (`/pagos` o tab en orden): intentos por orden, estado,
  referencias del provider, botón "marcar como pagado" (manual), botón refund con
  confirmación. (Ver [[sprint1_r14_payments]].)
- Pantalla **Envíos** (`/envios` o tab en orden): crear shipment con tracking +
  carrier, cambiar estado, notificar. (Ver [[sprint1_r15_shipping]].)
- Mejoras transversales:
  - `/inventario/bajo-stock`: reemplazar `pageSize: 100` por **paginado real**.
  - **Búsqueda con debounce** (≥300 ms) en listados.
  - **Permisos:** ocultar **y deshabilitar** acciones sin permiso (hoy solo se
    oculta el item del sidebar). (Ver [[sprint1_r2_users_roles]].)
  - **Dashboard** con KPIs reales (órdenes recientes, pendientes de pago, alertas
    de stock).
- **Paginado real** en `GET /orders` (hoy devuelve array sin total).

## Criterios de aceptación

- [ ] Una venta completa puede gestionarse end-to-end desde el admin (cliente +
      pago + envío).
- [ ] Ningún botón de mutación es visible/activo sin el permiso.
- [ ] El dashboard ya no muestra texto "aparecerán conforme avance el desarrollo".
- [ ] Listados con paginado real y búsqueda con debounce.

## Estado

**Parcial:** Órdenes operativo; faltan Clientes, Pagos, Envíos, paginado real,
debounce, permisos que deshabilitan y dashboard real. Prioridad #3 entre las
brechas bloqueantes del Sprint 1.
