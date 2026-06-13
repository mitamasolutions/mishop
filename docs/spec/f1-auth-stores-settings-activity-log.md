# Fase 1 — Auth, ACL, Multi-tienda, Settings y Activity Log (equivalencia nopCommerce)

## Resumen

Base administrativa de mitama-commerce: autenticación de usuarios de backoffice
con JWT, control de acceso granular por permisos y roles, soporte multi-tienda
con scoping estricto por `store_id`, settings tipados en dos niveles, registro
de actividad inmutable y datos de referencia (países, regiones, monedas).
Equivale funcionalmente a Customers/Roles, ACL, Multi-store, Settings y
Activity Log de nopCommerce, acotado a usuarios administrativos.

## Historia de usuario

> Como desarrollador, quiero implementar la base de usuarios, permisos,
> multi-tienda, settings y registro de actividad, para que el resto de los
> módulos de la plataforma se construyan sobre una administración segura y
> multi-tienda desde el día uno.

## Alcance

**Dentro:**

- Módulos `auth`, `stores`, `settings`, `activity-log` y `reference-data`.
- Login email+contraseña, JWT access + refresh con rotación, bloqueo por
  intentos, recuperación de contraseña, invitación de usuarios.
- ACL por recurso/acción, roles predefinidos y personalizados, guard
  `@RequirePermission()`.
- CRUD de tiendas, asignación usuario↔tienda con rol por tienda, scoping
  automático por `store_id` (middleware Prisma).
- Settings tipados global / por tienda, con cache e invalidación por evento.
- Activity log de mutaciones (quién, qué, entidad, cuándo, IP, diff).
- Tablas de referencia `country`, `region`, `currency` cargadas por seed
  (datos estilo Medusa), solo lectura por API.
- Tabla de roles separada y tabla de contraseñas hasheadas separada de la
  tabla de usuarios, con historial.
- Admin (Next.js): login, layout (sidebar, selector de tienda, dark mode),
  CRUD de usuarios/roles/tiendas/settings, vista de activity log.
- Seed: catálogo de permisos, roles predefinidos, super admin, tienda demo,
  datos de referencia.
- Test de integración anti-fuga de datos entre tiendas.

**Fuera:**

- Clientes finales (customers de la tienda) y storefront.
- Proveedor real de email (los envíos se registran en log).
- CRUD de admin para country/region/currency.
- 2FA, SSO, OAuth.
- Catálogo, órdenes, inventario, POS (fases futuras).

## Requisitos funcionales

### Autenticación (`auth`)

1. Login con email + contraseña que devuelve un access token JWT (15 min) y
   un refresh token (7 días).
2. Rotación de refresh tokens: cada refresh emite un par nuevo e invalida el
   anterior; si se detecta reuso de un refresh ya rotado, se revoca toda la
   familia de tokens de esa sesión.
3. Bloqueo por intentos: 5 intentos fallidos consecutivos bloquean la cuenta
   15 minutos; el contador se resetea con un login exitoso.
4. Recuperación de contraseña: genera un token de un solo uso con expiración
   de 1 hora; el "envío" del email se registra en log/consola.
5. Invitación de usuarios: un admin crea el usuario con email y rol; el
   sistema genera un token de invitación válido 72 horas; el invitado define
   su contraseña al aceptarla. Mientras tanto el usuario está `invited` y no
   puede hacer login.
6. Estados de usuario: `invited`, `active`, `locked`, `disabled`. Un usuario
   `disabled` no puede hacer login ni usar refresh tokens vigentes.
7. Las contraseñas se hashean con Argon2id y viven en una tabla separada de
   la de usuarios; cada cambio crea un registro nuevo (historial) y no se
   permite reutilizar ninguna de las últimas 4 contraseñas.

### ACL y roles

8. Catálogo de permisos fijo en código, como pares recurso/acción
   (ej. `users.create`, `stores.read`).
9. Tabla de roles separada. Roles predefinidos: **Super Admin** (todos los
   permisos, no editable ni borrable), **Admin de tienda** y **Operador**.
   Se pueden crear roles personalizados seleccionando permisos del catálogo.
10. Guard `@RequirePermission('<recurso>.<acción>')` aplicable a cualquier
    endpoint; sin el permiso correspondiente la petición se rechaza con 403.
11. La asignación usuario↔rol es por tienda: un usuario puede tener roles
    distintos en tiendas distintas. El Super Admin es el único rol global,
    no scoped por tienda.

### Multi-tienda (`stores`)

12. CRUD de tiendas con: nombre, código único, URL, moneda por defecto
    (FK a `currency`), región (FK a `region`) y estado activo/inactivo.
    Las tiendas no se borran: solo se desactivan.
13. La tienda activa de cada petición se indica con el header `X-Store-Id`;
    un guard valida que el usuario tenga rol en esa tienda (o sea Super
    Admin) antes de procesar.
14. Scoping automático por `store_id` vía middleware/extensión de Prisma para
    todas las tablas scoped (en esta fase: settings por tienda, asignaciones
    usuario↔tienda, activity log). Si una query a tabla scoped se ejecuta sin
    `store_id` en el contexto, el middleware lanza error (fail-closed).
15. Tablas globales exentas de scoping: usuarios, roles, permisos, country,
    region, currency.

### Datos de referencia (`reference-data`)

16. Tablas `currency` (code, symbol, symbol_native, decimal_digits, rounding,
    name), `region` (id, name, currency_code, automatic_taxes) y `country`
    (iso_2, iso_3, num_code, name, display_name, region_id opcional), con
    `created_at` / `updated_at` / `deleted_at` (soft delete).
17. Endpoints de solo lectura (listado y detalle) que excluyen registros con
    `deleted_at`. Los datos se cargan por seed desde los CSV provistos.

### Settings (`settings`)

18. Settings tipados (string, number, boolean, json) con catálogo de claves
    válidas definido en código; no se crean claves arbitrarias por API.
19. Dos niveles: valor global y override opcional por tienda. Al leer una
    clave en contexto de tienda, el override de la tienda gana sobre el
    global.
20. Cache en memoria por proceso, invalidada por el evento `settings.updated`
    publicado en el EventBus de `@mitama/core`.

### Activity log (`activity-log`)

21. Toda mutación (create/update/delete) de la API admin registra: usuario,
    acción, tipo de entidad, id de entidad, tienda, IP, timestamp y un diff
    resumido de los cambios. Las lecturas no se registran.
22. El log es inmutable: no existe API para editarlo ni borrarlo.
23. Consulta del log con filtros por usuario, tipo de entidad, acción, tienda
    y rango de fechas, paginada.

### Admin (Next.js)

24. Página de login en español.
25. Layout con sidebar de navegación, selector de tienda activa y toggle de
    dark mode.
26. CRUD de usuarios (incluye invitar), roles (incluye permisos), tiendas y
    settings; vista de solo lectura del activity log con filtros.
27. Sesión: refresh token en cookie httpOnly; access token solo en memoria
    del cliente.

### Seed

28. El seed crea: catálogo de permisos, roles predefinidos, super admin
    (`admin@mitama.local`, contraseña tomada de `.env`), tienda demo
    "Tienda Demo" (moneda MXN, región México) y los datos de
    country/region/currency desde los CSV.

## Reglas de negocio

- El rol Super Admin no se puede editar, borrar ni quitarle permisos.
- Un rol en uso (asignado a algún usuario en alguna tienda) no se puede
  borrar.
- No se puede desactivar ni degradar al último usuario con rol Super Admin.
- Las tiendas nunca se borran físicamente; la desactivación impide operar
  sobre ellas pero conserva sus datos.
- Los permisos solo existen en el catálogo en código: la API no permite
  inventar recursos/acciones nuevos.
- Toda escritura sobre entidades scoped exige una tienda activa válida en el
  contexto de la petición.
- El historial de contraseñas conserva los hashes anteriores; se rechaza una
  nueva contraseña igual a cualquiera de las últimas 4.
- Los identificadores de código van en inglés; UI, mensajes de error y docs
  en español.

## Criterios de aceptación

- [ ] Un usuario `active` con credenciales válidas obtiene access + refresh
      token; con contraseña incorrecta recibe error sin revelar si el email
      existe.
- [ ] Tras 5 intentos fallidos la cuenta queda `locked` 15 minutos y el login
      correcto durante el bloqueo también se rechaza.
- [ ] Usar un refresh token ya rotado revoca toda la familia y obliga a
      re-login.
- [ ] Un token de recuperación expirado o ya usado es rechazado.
- [ ] Un usuario `invited` no puede hacer login; tras aceptar la invitación y
      definir contraseña pasa a `active` y puede entrar.
- [ ] Cambiar la contraseña a una de las últimas 4 usadas es rechazado con
      mensaje en español.
- [ ] Un endpoint protegido con `@RequirePermission()` devuelve 403 a un
      usuario sin ese permiso en la tienda activa, y 200 a uno que sí lo
      tiene.
- [ ] Un usuario con rol solo en la tienda A recibe 403 al enviar
      `X-Store-Id` de la tienda B; un Super Admin puede operar en cualquier
      tienda.
- [ ] **Test anti-fuga:** con dos tiendas pobladas, ninguna consulta de un
      usuario de la tienda A devuelve registros scoped de la tienda B; y una
      query a tabla scoped sin `store_id` en contexto lanza error.
- [ ] Un override de setting por tienda gana sobre el valor global al leer en
      contexto de esa tienda; sin override se devuelve el global.
- [ ] Tras actualizar un setting, el evento `settings.updated` invalida la
      cache y la siguiente lectura devuelve el valor nuevo.
- [ ] Escribir un setting con tipo incorrecto o clave fuera del catálogo es
      rechazado.
- [ ] Cada mutación de la API admin genera exactamente una entrada de
      activity log con usuario, acción, entidad, tienda, IP y timestamp; las
      lecturas no generan entradas.
- [ ] Los endpoints de country/region/currency devuelven los datos del seed y
      excluyen registros con `deleted_at`.
- [ ] El seed deja el sistema operable: login del super admin, tienda demo
      visible, permisos y roles predefinidos presentes, datos de referencia
      cargados. El seed es idempotente (correrlo dos veces no duplica datos).
- [ ] En el admin: login funcional, selector de tienda cambia el contexto de
      los CRUDs, dark mode persiste, y los CRUDs de
      usuarios/roles/tiendas/settings operan contra la API.
- [ ] `yarn lint` pasa (boundaries entre módulos) y `yarn test` pasa con los
      casos de uso testeados con adapters in-memory.

## Flujo principal

1. Se ejecuta el seed: permisos, roles, super admin, tienda demo y datos de
   referencia quedan creados.
2. El super admin entra al admin (login) y ve el layout con la tienda demo
   seleccionada.
3. Crea una segunda tienda y un rol personalizado.
4. Invita a un usuario asignándole ese rol en la segunda tienda; el invitado
   acepta, define contraseña y entra.
5. El nuevo usuario solo ve y opera la segunda tienda; sus mutaciones quedan
   registradas en el activity log con su IP.
6. El super admin ajusta un setting global y un override por tienda; las
   lecturas reflejan la precedencia y la cache se invalida por evento.
7. El super admin revisa el activity log filtrando por usuario y tienda.

## Casos borde y manejo de errores

- Login con email inexistente → mismo error genérico que contraseña
  incorrecta (no se revela existencia de cuentas).
- Refresh token expirado o de un usuario `disabled` → 401, sesión terminada.
- Reuso de refresh rotado (posible robo) → revocación de toda la familia de
  tokens y registro del incidente en el activity log.
- Petición a recurso scoped sin header `X-Store-Id` → 400 con mensaje en
  español.
- `X-Store-Id` de tienda inexistente o inactiva → 404/403 según el caso.
- Intento de borrar un rol asignado → 409 con mensaje explicativo.
- Intento de editar/borrar el rol Super Admin → 403.
- Intento de desactivar al último Super Admin → 409.
- Token de invitación expirado → el admin puede reenviar la invitación
  (genera token nuevo, invalida el anterior).
- Query Prisma a tabla scoped sin `store_id` en contexto → excepción
  (fail-closed), nunca devuelve datos sin filtrar.
- Fallo al escribir el activity log durante una mutación → la mutación falla
  (el log es parte de la transacción); no hay mutaciones sin rastro.

## Asunciones

1. Solo usuarios administrativos en esta fase; customers fuera de alcance.
2. Historial de contraseñas en tabla separada; prohibidas las últimas 4.
3. Hash con Argon2id.
4. Access JWT 15 min, refresh 7 días, rotación con detección de reuso y
   revocación de familia.
5. Bloqueo: 5 intentos → 15 minutos; reset al login exitoso.
6. Recuperación: token de un solo uso, 1 hora; email simulado por log.
7. Invitación: token de 72 h; usuario `invited` hasta aceptar.
8. Estados de usuario: `invited`, `active`, `locked`, `disabled`.
9. Permisos = recurso/acción en catálogo fijo en código.
10. Roles predefinidos: Super Admin (intocable), Admin de tienda, Operador;
    más roles personalizados.
11. Roles globales; asignación usuario↔rol por tienda.
12. Super Admin es el único rol no scoped por tienda.
13. Tienda: nombre, código único, URL, moneda (FK currency), región
    (FK region), activo/inactivo; sin borrado físico.
14. Tienda activa por header `X-Store-Id`, validada por guard.
15. Scoping por `store_id` en tablas de negocio; referencia/usuarios/roles
    globales y exentos.
16. Country/region/currency desde CSV estilo Medusa, solo lectura, con soft
    delete.
17. Datos de referencia en módulo propio `reference-data`.
18. Settings tipados con catálogo en código; override por tienda gana al
    global.
19. Cache de settings en memoria por proceso, invalidada por
    `settings.updated`.
20. Activity log automático de mutaciones con diff resumido; inmutable;
    lecturas no logueadas.
21. Admin: login, sidebar, selector de tienda, dark mode, CRUDs y vista de
    log, todo en español.
22. Sesión admin: refresh en cookie httpOnly, access en memoria.
23. Seed: permisos, roles, super admin `admin@mitama.local` (contraseña por
    `.env`), tienda demo MXN/México, datos de referencia.
24. Test de integración anti-fuga entre tiendas + fail-closed del middleware.
