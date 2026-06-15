# Sprint 1 · r2 — Usuarios, Roles y ACL (auth)

> Estado: ✅ entregado · Origen: `f1-auth-stores-settings-activity-log` + PLAN_REFORCE F1 · Hito: F1 (Seguridad/RBAC)
> Módulo: `packages/modules/auth`

## Resumen

Control de acceso granular por permisos (recurso/acción) y roles, con guard
`@RequirePermission()` **fail-closed**, roles predefinidos y personalizados, y
asignación usuario↔rol por tienda. Es la base de autorización de toda la API
admin. Equivale a ACL + Roles de nopCommerce.

## Historia de usuario

> Como super admin, quiero definir roles con permisos granulares y asignarlos a
> usuarios por tienda, para que cada operador solo pueda ejecutar las acciones
> que le corresponden y ningún endpoint quede abierto por descuido.

## Alcance

**Dentro:**
- Catálogo de permisos fijo en código (pares recurso/acción).
- Tabla de roles separada; roles predefinidos + personalizados.
- Guard `@RequirePermission('<recurso>.<acción>')` aplicable a cualquier endpoint.
- Asignación usuario↔rol **por tienda**.
- **RBAC fail-closed** (PLAN_REFORCE F1): un endpoint autenticado sin
  `@RequirePermission` ni `@Public()` debe fallar por defecto.
- Prohibición de recibir `actorId`/`authorId`/`storeId`/`customerId` desde
  body/query en endpoints admin.
- Admin: CRUD de usuarios (incluye invitar) y roles (incluye permisos).

**Fuera:**
- Creación de recursos/acciones nuevos por API (catálogo cerrado en código).

## Requisitos funcionales

1. Catálogo de permisos fijo en código, como pares **recurso/acción**
   (ej. `users.create`, `stores.read`).
2. Tabla de roles separada. Roles predefinidos: **Super Admin** (todos los
   permisos, no editable ni borrable), **Admin de tienda** y **Operador**.
   Se pueden crear roles personalizados seleccionando permisos del catálogo.
3. Guard `@RequirePermission('<recurso>.<acción>')` aplicable a cualquier
   endpoint; sin el permiso correspondiente la petición se rechaza con **403**.
4. La asignación usuario↔rol es **por tienda**: un usuario puede tener roles
   distintos en tiendas distintas. El **Super Admin** es el único rol global, no
   scoped por tienda.
5. **Fail-closed:** un endpoint autenticado que no declara `@RequirePermission`
   ni `@Public()` falla por defecto (o exige Super Admin de forma explícita).
6. `@RequirePermission` consistente en `catalog`, `inventory`, `stores`,
   `orders`, `payments`, `shipping`, `customers` (y los ya existentes de
   `auth`/`reference-data`/`activity-log`/`settings`).
7. Datos sensibles **nunca** desde el cliente en endpoints admin: `actorId` /
   `authorId` desde `CurrentUser`; `storeId` desde `CurrentStore`/contexto;
   `customerId` desde el recurso cargado en DB.

## Reglas de negocio

- El rol Super Admin no se puede editar, borrar ni quitarle permisos.
- Un rol en uso (asignado a algún usuario en alguna tienda) no se puede borrar.
- No se puede desactivar ni degradar al último usuario con rol Super Admin.
- Los permisos solo existen en el catálogo en código: la API no permite inventar
  recursos/acciones nuevos.

## Asunciones

- Permisos = recurso/acción en catálogo fijo en código.
- Roles predefinidos: Super Admin (intocable), Admin de tienda, Operador; más
  personalizados.
- Roles globales; asignación usuario↔rol por tienda.
- Super Admin es el único rol no scoped por tienda.
- Permisos mínimos: `products.*`, `inventory.*`, `orders.*`, `payments.*`,
  `shipping.*`, `customers.*`, `settings.*`, `stores.*`.

## Criterios de aceptación

- [ ] Un endpoint nuevo sin `@RequirePermission` falla por defecto en tests.
- [ ] Un endpoint protegido devuelve 403 a un usuario sin ese permiso en la
      tienda activa, y 200 a uno que sí lo tiene.
- [ ] Tests e2e cubren: usuario sin token, con token pero sin permiso, con
      permiso correcto.
- [ ] Ningún endpoint admin acepta `storeId`/`actorId` desde body.
- [ ] Intentar borrar un rol asignado → 409 con mensaje explicativo.
- [ ] Intento de editar/borrar el rol Super Admin → 403.
- [ ] Intento de desactivar al último Super Admin → 409.
- [ ] El seed deja permisos y roles predefinidos presentes (idempotente).

## Estado

**Entregado:** ACL por recurso/acción con `@RequirePermission` aplicado de
forma consistente en todos los controladores (commit `ca8486e`), guard
fail-closed, controllers de users y roles, seed de catálogo de permisos y roles.
Cubre el hito F1 junto con [[sprint1_r1_auth]] y [[sprint1_r3_stores]].

**Pendiente:** en el admin (UI), ocultar **y deshabilitar** acciones de mutación
cuando el usuario no tiene el permiso (hoy solo se oculta el item del sidebar) —
ver [[sprint1_r23_admin_operativo]].
