# mitama-commerce — Guía para agentes

Plataforma open source (MIT) de ecommerce + POS para LATAM. Modular monolith
**hexagonal** en monorepo TypeScript estricto. Español-first: UI, docs y
mensajes de error en español; identificadores de código en inglés.

> **Planeación = fuente de verdad:** `docs/ROADMAP.md` (estado real + sprints) y
> `docs/specs/sprint1_*.md` (specs por requisito). Léelos antes de planear o
> implementar. El **Sprint 1** (MVP ecommerce API + Admin) está **cerrado**; el
> siguiente es el **Sprint 2** (tienda pública `apps/web`).

## Mapa del repo

```
apps/
  api/        # SOLO composición: bootstrap NestJS, config global, prefijo /v1, Swagger en /docs (flag)
  admin/      # Next.js (App Router) + Tailwind v4 + shadcn/ui (puerto 3001)
  # web/      # tienda pública — Sprint 2, aún no existe
lib/
  core/       # Shared kernel TS puro (CERO deps): Result, errores, EventBus, Entity/VO/UseCase
  contracts/  # Eventos, puertos e interfaces compartidas (+ contrato de pagos + token EVENT_BUS)
  db/         # Prisma multi-archivo (prisma/schema/<feature>.prisma) + migraciones + PrismaService/DbModule
  config/     # tsconfig base + ESLint compartido (incluye reglas de boundaries)
features/     # UN paquete @mitama/features con las 17 features de negocio
  src/
    <feature>/    # auth/, orders/, payments/, ...  (cada una: domain/application/infra/http + <f>.module.ts + <f>.tokens.ts + index.ts)
    index.ts      # barrel: re-exporta los *Module y símbolos públicos que usa apps/api
plugins/
  payment_manual/        # @mitama/payment_manual       (Manual + Cash)
  payment_mercado_pago/  # @mitama/payment_mercado_pago (provider MP + HttpMercadoPagoClient + puerto)
tools/        # new-feature.mjs + plantillas del generador
docs/         # ROADMAP.md (planeación) + specs/ + DEPLOY.md + providers/
```

**Features** (`features/src/`), todas registradas en `apps/api/src/app.module.ts`
vía el barrel `@mitama/features`:

- **Núcleo ecommerce (operativo):** `auth`, `stores`, `settings`, `activity-log`,
  `reference-data`, `catalog`, `inventory`, `customers`, `cart`,
  `orders`, `payments`, `shipping`, `taxes`, `scheduled-tasks`.
- **Congelados** (construidos, **fuera del checkout MVP**; no cablearlos al
  carrito/órdenes sin decisión explícita): `promotions`, `giftcards`, `reviews`.

## Reglas de arquitectura (inviolables)

1. **Dependencias hacia adentro:** `http → application → domain`. `infra`
   implementa los puertos (interfaces) de `domain`. `domain` no importa nada
   externo (solo `@mitama/core` / `@mitama/contracts`).
2. **Prisma SOLO en `infra/`** de cada feature (y en `lib/db`, su dueño).
   Los casos de uso dependen de puertos, nunca del cliente Prisma.
3. **Una feature NUNCA importa internals de otra:** solo el barrel hermano
   (`../<feature>` que resuelve al `index.ts`) o `@mitama/contracts`. ESLint
   (`no-restricted-imports` regex en `lib/config/eslint.config.base.mjs`) lo
   hace fallar en CI.
4. **Comunicación entre features = eventos** del bus de `@mitama/core`
   (`EventBus`, token `EVENT_BUS` de `@mitama/contracts`) **o puertos** en
   `@mitama/contracts`, nunca imports directos.
5. **`apps/api` no contiene lógica:** solo registra módulos NestJS y
   configuración global (validación de env, prefijo `/v1`, pipes, CORS, helmet,
   throttler, Swagger).
6. La composición de cada feature (puertos → adapters) vive en su
   `<feature>.module.ts` en la raíz de `features/src/<feature>/`, fuera de las
   capas.
7. **Plugins de pago** viven en `plugins/payment_*` y solo dependen de
   `@mitama/contracts` + `@mitama/core` (+ stdlib). El contrato
   `PaymentProvider` y sus tipos están en `@mitama/contracts/payments`.

## Patrones ya implementados (reúsalos, no los reinventes)

- **Eventos + puertos entre features:** `EventBus` (token `EVENT_BUS`) y puertos en
  `@mitama/contracts` (p. ej. `OrderForPaymentsPort`, `TaxResolverPort`,
  `ShippingResolverPort`).
- **Outbox transaccional** (`orders`): los eventos se persisten en la misma
  transacción que el agregado y se despachan con *claim-then-publish*. Ver
  `features/src/orders/domain/outbox.ts` + `infra/prisma-outbox-dispatcher.ts`.
- **Máquinas de estado** separadas para orden y pago, con historial de
  transiciones (`features/src/orders/domain/order.entity.ts`).
- **Inventario por ubicación** con reservas **claim-then-apply**; consumo al
  `payment.paid` y liberación al fallar/cancelar/expirar
  (`features/src/inventory` + `features/src/orders/infra/payment-events.handler.ts`).
- **Idempotencia:** header `Idempotency-Key` en checkout/órdenes; por `eventId`
  con `storeId` en webhooks de pago.
- **Totales server-side:** el checkout recalcula subtotal/envío/impuestos; nunca
  confía en los totales del carrito (`orders/CreateOrderUseCase`).
- **Plugins de pago (Strategy + registry):** cada método implementa
  `PaymentProvider` (definido en `@mitama/contracts`) y vive en
  `plugins/payment_*`. Se registran en `PaymentProviderRegistry` desde el
  `payments.module.ts`; config por tienda en DB con cifrado obligatorio en
  producción y opcional en dev/test (`SETTINGS_ENCRYPTION_KEY`). Un método solo
  aparece en selectores si está habilitado **y** bien configurado.
- **Tareas programadas in-app** (`scheduled-tasks`, estilo nopCommerce): runner +
  tabla `ScheduledTask` con lock por fila; reemplaza el cron externo
  (`dispatch-outbox`, `release-expired-reservations`, `drain-email-queue`).

## Configuración global del API (`apps/api`)

- Prefijo **`/v1`** (excepto `health` y `health/db`).
- Validación de env en `src/config/env.ts` (`DATABASE_URL`, `JWT_SECRET`,
  `JWT_REFRESH_SECRET`, `API_DOCS_ENABLED`); el arranque falla si faltan o si los
  secretos son cortos en producción.
- `helmet` + CSP, `ValidationPipe` estricto (`whitelist` + `forbidNonWhitelisted`),
  CORS por whitelist (`CORS_ORIGINS`), rate limits con `ThrottlerModule`.
- Swagger en `/docs` solo con `API_DOCS_ENABLED=true`.
- Salud: `GET /health` y `GET /health/db` (públicas, sin versión).
- El refresh token del admin viaja en cookie **HttpOnly** (no `localStorage`).

## Principios de código

- **SOLID:** una responsabilidad por clase/caso de uso; dependencias por
  interfaces (puertos); extensión vía providers de NestJS.
- **Simple primero:** la solución más directa que cumpla. Nada de abstracciones
  especulativas ni patrones "por si acaso".
- **Reutilizable, sin duplicar:** lo compartido vive en `@mitama/core` o en la
  feature dueña del dominio. Antes de escribir un helper, busca si ya existe.
- **DRY con criterio:** prefiere duplicar 3 líneas a acoplar dos features;
  la regla 3 siempre gana.

## Convenciones multi-canal e idempotencia (ya implementadas)

- Las **órdenes** llevan `channel` (`web` | `pos`); hoy solo se origina `web`,
  pero el modelo soporta `pos` (base del POS, Sprint 3).
- El **inventario** se modela por ubicación (`location`), nunca como contador
  global por producto.
- Las **escrituras críticas** aceptan `Idempotency-Key` (misma clave → resultado
  original sin re-ejecutar). Es la base del sync offline del POS.

## Comandos

```bash
docker compose up -d        # Postgres 16 local (o apunta DATABASE_URL a Neon/Postgres gestionado)
corepack enable && yarn install
yarn build                  # turbo: build de todos los workspaces
yarn dev                    # API :3000 (/health, /docs, /v1) + Admin :3001
yarn test                   # Vitest: unit in-memory + e2e (apps/api/test, DB real)
yarn lint                   # ESLint, incluye boundaries entre features
yarn db:migrate             # prisma migrate dev — desarrollo
yarn db:deploy              # prisma migrate deploy — CI/producción
yarn db:reset               # resetea la DB de desarrollo
yarn db:seed                # permisos, roles, Super Admin (admin@mitama.local), tienda demo y datos de referencia
yarn new:feature <nombre>   # genera una feature nueva con capas + test (alias: new:module)
```

## Cómo crear una feature nueva

1. `yarn new:feature <nombre>` (kebab-case). No hace falta `yarn install`: la
   feature vive dentro de `@mitama/features`, ya registrado.
2. Re-exporta el módulo desde `features/src/index.ts`
   (`export { <Nombre>Module } from './<nombre>';`).
3. Registra `<Nombre>Module` en `apps/api/src/app.module.ts`.
4. Si necesita persistencia: crea `lib/db/prisma/schema/<nombre>.prisma` y corre
   `yarn db:migrate` (las migraciones son versionadas; el baseline vive en
   `prisma/schema/migrations/`).
5. Reemplaza el adapter in-memory de `infra/` por uno de Prisma cuando toque
   persistir.
6. Patrones de referencia: `features/src/auth` (capas + tests in-memory) y
   `features/src/orders` (outbox, eventos, máquinas de estado, idempotencia).

## Testing

- Vitest en `lib/core`, `features/` y cada plugin. Los specs viven junto al
  código (`*.spec.ts`) y se excluyen del build.
- Los casos de uso se testean con adapters in-memory; nunca toques Prisma ni
  NestJS en un test unitario de application.
- Los e2e (`apps/api/test/*.e2e-spec.ts`) corren contra DB real en CI.

## Notas

- `README.md` es la portada pública del proyecto: no lo modifiques por cambios
  internos de scaffolding.
- El `.env` real nunca se versiona; `.env.example` documenta las variables.
- `SETTINGS_ENCRYPTION_KEY` es **obligatoria en producción** y opcional en
  dev/test: vacía fuera de producción → los settings de plugin se guardan/leen
  en plano; con valor → cifrado/descifrado transparente.
- La planeación viva está en `docs/ROADMAP.md`; las specs por requisito en
  `docs/specs/`. `AGENTS.md` y este archivo se mantienen idénticos.
