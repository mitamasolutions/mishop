# Sprint 1 · Plan de cierre — Brechas bloqueantes del MVP

> Estado: ⬜ plan de ejecución · Origen: `docs/ROADMAP.md` (veredicto Sprint 1) ·
> Cubre las 6 brechas bloqueantes (r20, r22, r13, r14, r24, r23, r25)

## Contexto

El [ROADMAP](../ROADMAP.md) declara el Sprint 1 (MVP ecommerce API + Admin) como
**🟡 NO listo**: el núcleo está entregado pero quedan 6 brechas bloqueantes para
el criterio de "MVP vendible". Esta spec define el **flujo de ejecución único y
secuenciado** para cerrarlas, por prioridad y dependencias.

Dos decisiones de producto reorientan el alcance respecto a las specs originales:

- **Pagos ([r14](sprint1_r14_payments.md)):** no es "agregar un adapter de Mercado
  Pago", sino formalizar un **sistema de plugins de pago con patrón Strategy**
  sobre el core de `payments`. Cada método (manual, Mercado Pago, futuros) es un
  plugin que: reusa la base core, declara y valida su **propia configuración**
  (con vistas de configuración en admin), se habilita/activa por tienda, aparece
  en selectores solo si está **activo y bien configurado**, y **dispara alerta**
  si está activo pero mal configurado. Config **cifrada por tienda en DB**.
- **Tareas programadas ([r24](sprint1_r24_outbox_worker_observability.md)):** el
  proyecto gestiona sus **propias tareas programadas estilo nopCommerce** (tabla
  `ScheduledTask` + runner in-app + administración), reemplazando el cron externo.
  **No** se crea `apps/worker`. Esto **simplifica r25** (sin Dockerfile/servicio
  de worker).

Las specs afectadas (`sprint1_r14`, `sprint1_r24`, `sprint1_r25`) se actualizarán
durante la ejecución para reflejar esta arquitectura.

**Base ya existente (reusar, no reinventar):**

- `PaymentProvider` + `PaymentProviderRegistry` ya son la base del Strategy:
  `packages/modules/payments/src/domain/payment-provider.ts`.
- Outbox transaccional claim-then-publish: `orders/src/domain/outbox.ts` +
  `infra/prisma-outbox-dispatcher.ts` + `DispatchOutboxEventsUseCase`.
- `RequestContextService` (AsyncLocalStorage):
  `packages/modules/stores/src/store-context.interceptor.ts` — extender para
  `requestId`.
- Patrón de pantallas admin: `apps/admin/src/app/(app)/ordenes/` +
  `lib/api/orders.ts` + `components/app-sidebar.tsx`.

## Orden de ejecución

`F0 r20` → `F1 r22` → `F2 r13` → `F3 r14` → `F4 r24` → `F5 r23` → `F6 r25`.

Razonamiento: r20 es base de r14 (webhook `storeId`) y r8 (handles); r13 da
totales correctos antes de cobrar; r14 depende de ambos; r24 es subsistema
backend independiente; r23 consume r14/r24 en UI; r25 cierra calidad/deploy.

---

## F0 · r20 — Constraints DB (base, pequeño)

**Objetivo:** cerrar integridad estructural. Archivos:
`packages/db/prisma/schema/{catalog,payments,taxes}.prisma` + nueva migración SQL
en `packages/db/prisma/schema/migrations/`.

- **Índices únicos parciales** para reutilizar handle/sku tras soft-delete: quitar
  `@unique` de `Product.handle` (catalog.prisma:19) y `ProductVariant.sku`
  (catalog.prisma:223); añadir en migración SQL
  `CREATE UNIQUE INDEX ... WHERE deleted_at IS NULL`.
- **`storeId` en unicidad de webhooks:** añadir `storeId` a `PaymentWebhookEvent`;
  migrar `@@unique([providerCode, eventId])` →
  `@@unique([storeId, providerCode, eventId])`. (Derivar `storeId` se hace en F3.)
- **`TaxRule.rate >= 0`:** CHECK en migración (taxes.prisma).

**Verificación:** la migración aplica; alta con mismo handle tras soft-delete
funciona (test); dos tiendas con mismo `eventId` no colisionan.

---

## F1 · r22 — Hardening del Admin (#1 bloqueante de producción)

**Objetivo:** sesión segura y build de prod estricto. Reusa CORS `credentials:true`
ya activo (`apps/api/src/main.ts`).

- **Refresh token en cookie HttpOnly/Secure/SameSite:**
  - API (`auth`): `/auth/login` y `/auth/refresh` setean el refresh en cookie
    HttpOnly; `/auth/refresh` la **lee de la cookie** (no del body);
    `/auth/logout` la limpia.
  - Admin: `apps/admin/src/lib/auth-store.ts` deja de persistir `refreshToken` en
    `localStorage` (solo `user`+`activeStoreId`); `lib/api-client.ts` usa
    `credentials: 'include'`. Access token sigue solo en memoria.
- **`NEXT_PUBLIC_API_URL` obligatoria:** eliminar el fallback
  `?? 'http://localhost:3000'` en `lib/api-client.ts`; fallar el build prod si
  falta.
- **CSP/headers** en `apps/admin/next.config.ts` vía `headers()`:
  `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`.
- **Auditar `skipStoreScope`** en `apps/admin/src/lib/api/*`: dejarlo solo en
  endpoints globales (settings global, reference-data, activity-log global, auth,
  health).

**Verificación:** build prod falla sin `NEXT_PUBLIC_API_URL`; DevTools muestra
CSP; el refresh ya no es visible en `localStorage`; login→refresh→logout vía
cookie (preview).

---

## F2 · r13 — Checkout server-side: totales reales (correctitud)

**Objetivo:** el servidor recalcula subtotal/impuestos/envío; deja de confiar en
el carrito. Hoy `Order.fromCart` hardcodea `taxAmount=0`/`taxTotal=0` y copia
`cart.shippingMethod.amount` (`orders/src/domain/order.entity.ts`).

- **Puertos nuevos en `@mitama/contracts`** (orders no importa internals):
  - `TaxResolverPort`: dado `(storeId, regionId, líneas con categoría,
    pricesIncludeTax)` devuelve impuesto por línea + `taxTotal`. Adapter en
    `taxes/infra` sobre `TaxRule` + `StoreTaxSetting`.
  - `ShippingResolverPort`: dado `(storeId, método elegido, zona, peso, subtotal)`
    devuelve el costo server-side y valida elegibilidad por zona. Adapter en
    `shipping/infra` sobre `StoreShippingMethod`/zonas.
- **`CreateOrderUseCase`** (`orders/src/application/order-use-cases.ts`): tras
  validar carrito y antes de crear la orden, **recalcula** subtotal por línea,
  shipping vía `ShippingResolverPort` y taxes vía `TaxResolverPort`; construye la
  orden con esos totales (no los del carrito). Validar canal/tienda del producto
  vs carrito.
- **Snapshot ampliado** en `Order`/`OrderLine` (`order.entity.ts` +
  `orders.prisma`): `taxAmount` real por línea, `currencyCode` por línea (ya
  existe), `shippingMethod` resuelto server-side. Mantener inmutabilidad.
- Reusar el flujo atómico existente (idempotencia → validar → reservar → crear →
  outbox); solo cambia el cálculo de montos.

**Verificación:** test in-memory: manipular `currentUnitPrice`/
`shippingMethod.amount`/`taxTotal` del carrito no altera los totales de la orden;
orden con líneas `standard`/`0%`/`exento` calcula `taxTotal` correcto; `storeId`
por header de otra tienda no confirma carrito ajeno.

---

## F3 · r14 — Sistema de plugins de pago (Strategy) + Mercado Pago real

**Objetivo:** core de payments con plugins por método. Reusa `PaymentProvider` +
`PaymentProviderRegistry` (ya es Strategy) y `StorePaymentMethod` (`enabled` +
`encryptedCredentials`/`webhookSecret`).

- **Contrato de plugin ampliado** (`payments/src/domain/payment-provider.ts`):
  cada `PaymentProvider` declara su **descriptor de configuración** (campos
  requeridos) y un `validateConfig(config)` → estado `configured | misconfigured`.
  Mantener `authorize/capture/refund/void/handleWebhook`.
- **Plugins concretos** en `payments/src/infra/` (reemplazan los simulados de
  `simulated-payment-providers.ts`):
  - `ManualPaymentProvider` formalizado como plugin.
  - `MercadoPagoPaymentProvider` **real**: cliente HTTP/SDK oficial; `authorize`
    crea preferencia/payment intent y persiste `providerReference`; `handleWebhook`
    **verifica firma antes de parsear JSON**.
- **Cifrado opcional de settings de plugin:** servicio `SettingsCipher` (AES-GCM)
  cuya clave viene de `SETTINGS_ENCRYPTION_KEY` (env **opcional**, mecanismo
  general de settings, no exclusivo de pagos): si la clave está vacía/ausente, es
  un **no-op** (guarda/lee en plano); con clave, cifra al guardar y descifra al
  leer. La API arranca en ambos casos. El repo `StorePaymentMethod` pasa la
  config por el cipher; reemplazar/extender `EnvPaymentProviderConfigResolver` por
  un resolver **DB-backed** que aplica el cipher.
- **Disponibilidad/activación:** servicio `ResolveAvailablePaymentMethods(storeId)`
  = registrados ∩ `enabled` ∩ `configured`. Selectores (checkout payment step y
  admin) usan esta lista. Un método `enabled` pero `misconfigured` se **excluye
  del checkout** y se marca para alerta en admin.
- **Webhook con `storeId`:** en `HandlePaymentWebhookUseCase`
  (`payment-use-cases.ts`) derivar `storeId` desde `paymentId` (Payment→order)
  **antes** de `claimOrLoadEvent`; usar la unicidad `(storeId, providerCode,
  eventId)` de F0.
- **Vistas de configuración (admin):** pantalla de métodos de pago por tienda que
  lee el descriptor del plugin y permite configurar/activar; muestra **alerta** si
  activo+mal configurado. (UI con F5; el backend de config va aquí.)

**Verificación:** e2e webhooks (duplicado→200 sin re-ejecutar, firma inválida→401,
desorden no revierte, transitorio→5xx); no se puede autorizar monto ≠ orden;
método mal configurado no aparece en selector y dispara alerta; `paid`→orden
`confirmed` + stock consumido + email encolado.

---

## F4 · r24 — Tareas programadas propias (estilo nopCommerce) + observabilidad

**Objetivo:** subsistema de tareas programadas in-app (no cron externo, no
`apps/worker`). Reusa el outbox y los use cases de mantenimiento existentes.

- **Modelo `ScheduledTask`** (nuevo
  `packages/db/prisma/schema/scheduled-tasks.prisma`): `name`, `type`, `seconds`
  (intervalo), `enabled`, `stopOnError`, `lastStartUtc`, `lastEndUtc`,
  `lastSuccessUtc`, `lastError`. Estilo nopCommerce.
- **Registry + runner:** los módulos registran handlers por `type`; un runner con
  `@nestjs/schedule` (tick periódico) busca tareas due (`enabled` y
  `lastStartUtc + seconds <= now`), las ejecuta secuencialmente, actualiza marcas
  de tiempo y `lastError`. Lock simple por fila para no solapar.
- **Tareas registradas (seed por defecto):**
  - `dispatch-outbox` → `DispatchOutboxEventsUseCase` (ya existe).
  - `release-expired-reservations` → `ReleaseExpiredReservationsUseCase` (ya
    existe).
  - `drain-email-queue` → **nuevo** `DrainEmailQueueUseCase` que procesa
    `OrderEmailJob` (`queued`, `nextRunAt<=now`) con reintentos/backoff
    (`maxAttempts=3` ya en schema) detrás del puerto `EmailSender` (adapter
    log/SMTP). Hoy la cola se llena pero nadie la drena.
- **Eventos críticos por outbox:** enrutar los `eventBus.publish` directos de
  `payments` (`payment.*`), `orders` (`order.completed/cancelled/refunded`) y
  `shipping` (`shipment.notification_requested`) por el outbox transaccional
  (extender `save()` de los repos para aceptar `{ outbox }` como ya hace orders).
- **Observabilidad:** extender `RequestContextService`/`StoreContextInterceptor`
  con `requestId` por request; logger estructurado (pino vía `nestjs-pino`) que
  incluya `requestId`/`storeId`; eliminar `console.log` de runtime.
- **Admin:** pantalla "Tareas programadas" (listar, habilitar/deshabilitar, editar
  intervalo, "ejecutar ahora", ver último resultado). (UI con F5.)

**Verificación:** si la API cae tras `payment.paid`, al volver el runner procesa
consumo de stock + email; la cola de emails se drena con reintentos; cada request
lleva `requestId` correlacionable; las tareas corren solas sin cron externo.

---

## F5 · r23 — Admin operativo MVP

**Objetivo:** operar una venta end-to-end desde el admin. Reusa el patrón de
`ordenes/` (list+detalle, `withBusy`, Dialog, Table/Badge/Select) y el filtrado
por permisos de `app-sidebar.tsx` (`hasPermission`).

- **Pantalla Clientes** (`apps/admin/src/app/(app)/clientes/` +
  `lib/api/customers.ts`): listado con búsqueda; detalle con direcciones e
  historial de órdenes (`listOrders({customerId})`).
- **Pantalla Pagos** (tab en orden y/o `/pagos`): intentos por orden, estado,
  `providerReference`, botón "marcar como pagado" (manual) y refund con
  confirmación.
- **Pantalla Envíos** (tab en orden y/o `/envios`): crear `Shipment` con
  tracking+carrier, cambiar estado, notificar (encola `OrderEmailJob`).
- **Config de métodos de pago** (de F3) y **Tareas programadas** (de F4) como
  pantallas de administración.
- **Mejoras transversales:**
  - Paginado real en `GET /orders` (hoy array sin total) y en
    `inventario/bajo-stock` (hoy `pageSize:100`); reusar el shape paginado de
    `listInventoryItems`.
  - Búsqueda con **debounce** (≥300 ms) en listados (hook reutilizable).
  - Permisos: **ocultar y deshabilitar** acciones sin permiso con `hasPermission`.
  - **Dashboard** con KPIs reales (órdenes recientes, pendientes de pago, alertas
    de stock).
- Entradas de sidebar nuevas con su permiso (`customers.read`, `payments.read`,
  `shipping.read`, `settings.*`).

**Verificación:** una venta completa (cliente→pago→envío) se gestiona desde admin;
ningún botón de mutación visible/activo sin permiso; listados paginados con
debounce; dashboard sin placeholders (preview + screenshot).

---

## F6 · r25 — CI/CD y deploy (cierre)

**Objetivo:** CI que bloquee merges con DB real y deploy reproducible. **Sin**
worker dedicado (las tareas viven in-API, F4).

- **CI** (`.github/workflows/ci.yml`, hoy solo lint+build+test): añadir service
  `postgres:16-alpine`; pasos `yarn db:deploy` + `yarn db:seed` sobre la DB del
  job; `yarn test` con e2e real; cache Yarn/Turbo; pinear `actions/*` por SHA.
- **`scripts/deploy.sh`** (nuevo `scripts/`): `git pull` → `yarn install
  --immutable` → `yarn db:deploy` → `docker compose -f docker-compose.prod.yml up
  -d --build` → healthcheck `curl -fsSL .../health` → rollback básico si falla.
- **Imágenes a GHCR** tagueadas por SHA y `latest`.
- **`.env.example`** completo: `SETTINGS_ENCRYPTION_KEY` (opcional), claves Mercado
  Pago reales, `CORS_ORIGINS`, `NEXT_PUBLIC_API_URL`.
- **`docs/DEPLOY.md`:** quitar la sección de cron externo (reemplazada por las
  tareas programadas in-app de F4); documentar la nueva config.

**Verificación:** CI rojo bloquea merge ante lint/build/migración/seed/test
fallidos; `scripts/deploy.sh` corre limpio en un VPS y termina solo si los
healthchecks pasan.

---

## Verificación global

- **Unit (Vitest, in-memory):** cada use case nuevo/modificado (totales
  server-side, resolución de métodos de pago, drain de emails, runner de tareas)
  con adapters in-memory; sin Prisma/Nest.
- **E2E (DB real en CI):** webhooks de pago, checkout con totales, idempotencia,
  tareas programadas (dispatch/release/drain).
- **Lint:** `yarn lint` mantiene boundaries (comunicación por
  `@mitama/contracts`/eventos).
- **Admin:** verificación con `preview_*` (login cookie, pantallas nuevas,
  permisos, dashboard) y screenshots.
- Al cerrar cada fase, actualizar el estado del requisito en
  [`docs/ROADMAP.md`](../ROADMAP.md) (tabla de hitos + trazabilidad) y la spec
  correspondiente.

## Specs a actualizar durante la ejecución

- [`sprint1_r14_payments`](sprint1_r14_payments.md) → sistema de plugins Strategy
  + cifrado + activación/alertas.
- [`sprint1_r24_outbox_worker_observability`](sprint1_r24_outbox_worker_observability.md)
  → reemplazar "worker dedicado" por "tareas programadas in-app estilo
  nopCommerce".
- [`sprint1_r25_cicd_deploy`](sprint1_r25_cicd_deploy.md) → quitar worker
  Dockerfile/servicio; cron externo reemplazado por tareas in-app.
- Estados en [`docs/ROADMAP.md`](../ROADMAP.md) conforme avancen las fases.
</content>
