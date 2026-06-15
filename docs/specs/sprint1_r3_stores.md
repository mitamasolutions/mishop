# Sprint 1 · r3 — Multi-tienda (stores)

> Estado: ✅ entregado · Origen: `f1-auth-stores-settings-activity-log` + PLAN_REFORCE F1 · Hito: F1 (Seguridad/RBAC/single-store)
> Módulo: `packages/modules/stores`

## Resumen

Soporte multi-tienda con scoping estricto por `store_id`: CRUD de tiendas (sin
borrado físico), validación de la tienda activa por petición, y middleware de
Prisma que filtra automáticamente las tablas scoped (fail-closed). En el MVP la
operación es **single-store**, pero el modelo y las APIs conservan `storeId`
para futuro multi-tenant. Equivale a Multi-store de nopCommerce.

## Historia de usuario

> Como super admin, quiero administrar tiendas y que cada operación se ejecute
> en el contexto de una tienda válida, para que los datos de una tienda nunca se
> filtren a otra y la plataforma soporte multi-tienda desde el día uno.

## Alcance

**Dentro:**
- CRUD de tiendas con soft delete (desactivar, nunca borrar físicamente).
- Tienda activa por header `X-Store-Id`, validada por guard.
- Scoping automático por `store_id` vía middleware/extensión de Prisma
  (fail-closed) para tablas scoped.
- Tablas globales exentas de scoping: usuarios, roles, permisos, country,
  region, currency.
- Resolución single-store: tienda activa desde `X-Store-Id` o default store
  configurable cuando no viene y la ruta lo necesita.
- Admin: layout con sidebar, selector de tienda activa y dark mode; CRUD de
  tiendas.

**Fuera:**
- SaaS multi-tenant complejo (queda como Sprint futuro).

## Requisitos funcionales

1. CRUD de tiendas con: nombre, **código único**, URL, moneda por defecto (FK a
   `currency`), región (FK a `region`) y estado activo/inactivo. Las tiendas
   **no se borran**: solo se desactivan.
2. La tienda activa de cada petición se indica con el header **`X-Store-Id`**;
   un guard valida que el usuario tenga rol en esa tienda (o sea Super Admin)
   antes de procesar.
3. **Scoping automático por `store_id`** vía middleware/extensión de Prisma para
   todas las tablas scoped (settings por tienda, asignaciones usuario↔tienda,
   activity log). Si una query a tabla scoped se ejecuta sin `store_id` en el
   contexto, el middleware lanza error (**fail-closed**).
4. Tablas globales exentas de scoping: usuarios, roles, permisos, country,
   region, currency.
5. **Single-store (PLAN_REFORCE F1):** resolver la tienda activa desde
   `X-Store-Id` cuando viene, y desde un **default store configurable** cuando no
   viene y la ruta lo necesita. `@NoStoreScope()` se reduce a rutas realmente
   globales (auth, reference data, health) o públicas (cart/checkout/registro de
   cliente/webhooks).
6. **Admin:** layout con sidebar de navegación, selector de tienda activa y
   toggle de dark mode persistente; CRUD de tiendas.

## Reglas de negocio

- Las tiendas nunca se borran físicamente; la desactivación impide operar sobre
  ellas pero conserva sus datos.
- Toda escritura sobre entidades scoped exige una tienda activa válida en el
  contexto de la petición.
- Una tienda pertenece a una sola región (ver [[sprint1_r7_regions_territories_zones]]).

## Asunciones

- Tienda: nombre, código único, URL, moneda (FK currency), región (FK region),
  activo/inactivo; sin borrado físico.
- Tienda activa por header `X-Store-Id`, validada por guard.
- Scoping por `store_id` en tablas de negocio; referencia/usuarios/roles
  globales y exentos.
- Single-store como simplificación, no como deuda: `storeId` se conserva en
  datos y APIs internas.
- Seed: tienda demo "Tienda Demo" (moneda MXN, región México).

## Criterios de aceptación

- [ ] Un usuario con rol solo en la tienda A recibe 403 al enviar `X-Store-Id`
      de la tienda B; un Super Admin puede operar en cualquier tienda.
- [ ] **Test anti-fuga:** con dos tiendas pobladas, ninguna consulta de un
      usuario de la tienda A devuelve registros scoped de la tienda B; y una
      query a tabla scoped sin `store_id` en contexto lanza error.
- [ ] Petición a recurso scoped sin header `X-Store-Id` → 400 con mensaje en
      español (o resolución a default store si la ruta lo permite).
- [ ] `X-Store-Id` de tienda inexistente o inactiva → 404/403 según el caso.
- [ ] En el admin: el selector de tienda cambia el contexto de los CRUDs y el
      dark mode persiste.

## Estado

**Entregado:** módulo `stores` completo (CRUD + soft delete), scoping por
`store_id`, resolución single-store, layout admin con selector de tienda y dark
mode. Cubre el hito F1 junto con [[sprint1_r1_auth]] y [[sprint1_r2_users_roles]].

**Pendiente:** revisar que `skipStoreScope` en cada `apiFetch` del admin se use
solo en endpoints realmente globales — ver [[sprint1_r22_admin_hardening]].
