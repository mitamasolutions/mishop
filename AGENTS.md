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
packages/
  core/       # Shared kernel TS puro (CERO deps): Result, errores, EventBus, Entity/VO/UseCase
  contracts/  # Eventos, puertos e interfaces compartidas ENTRE módulos (+ token EVENT_BUS)
  db/         # Prisma multi-archivo (prisma/schema/<modulo>.prisma) + migraciones + PrismaService/DbModule
  config/     # tsconfig base + ESLint compartido (incluye reglas de boundaries)
  modules/    # 17 módulos de negocio (ver abajo)
tools/        # new-module.mjs + plantillas del generador
docs/         # ROADMAP.md (planeación) + specs/ + DEPLOY.md + providers/
```

**Módulos** (`packages/modules/`), todos registrados en `apps/api/src/app.module.ts`:

- **Núcleo ecommerce (operativo):** `auth`, `stores`, `settings`, `activity-log`,
  `reference-data`, `catalog`, `inventory`, `media`, `customers`, `cart`,
  `orders`, `payments`, `shipping`, `taxes`, `scheduled-tasks`.
- **Congelados** (construidos, **fuera del checkout MVP**; no cablearlos al
  carrito/órdenes sin decisión explícita): `promotions`, `giftcards`, `reviews`.

## Reglas de arquitectura (inviolables)

1. **Dependencias hacia adentro:** `http → application → domain`. `infra`
   implementa los puertos (interfaces) de `domain`. `domain` no importa nada
   externo (solo `@mitama/core`).
2. **Prisma SOLO en `infra/`** de cada módulo (y en `packages/db`, su dueño).
   Los casos de uso dependen de puertos, nunca del cliente Prisma.
3. **Un módulo NUNCA importa internals de otro:** solo su API pública
   (`@mitama/<modulo>`) o `@mitama/contracts`. ESLint
   (`no-restricted-imports` en `packages/config/eslint.config.base.mjs`) lo
   hace fallar en CI.
4. **Comunicación entre módulos = eventos** del bus de `@mitama/core`
   (`EventBus`, token `EVENT_BUS` de `@mitama/contracts`) **o puertos** en
   `@mitama/contracts`, nunca imports directos.
5. **`apps/api` no contiene lógica:** solo registra módulos NestJS y
   configuración global (validación de env, prefijo `/v1`, pipes, CORS, helmet,
   throttler, Swagger).
6. La composición de cada módulo (puertos → adapters) vive en su
   `<modulo>.module.ts` en la raíz de `src/`, fuera de las capas.

## Patrones ya implementados (reúsalos, no los reinventes)

- **Eventos + puertos entre módulos:** `EventBus` (token `EVENT_BUS`) y puertos en
  `@mitama/contracts` (p. ej. `OrderForPaymentsPort`, `TaxResolverPort`,
  `ShippingResolverPort`).
- **Outbox transaccional** (`orders`): los eventos se persisten en la misma
  transacción que el agregado y se despachan con *claim-then-publish*. Ver
  `orders/src/domain/outbox.ts` + `infra/prisma-outbox-dispatcher.ts`.
- **Máquinas de estado** separadas para orden y pago, con historial de
  transiciones (`orders/src/domain/order.entity.ts`).
- **Inventario por ubicación** con reservas **claim-then-apply**; consumo al
  `payment.paid` y liberación al fallar/cancelar/expirar
  (`inventory` + `orders/src/infra/payment-events.handler.ts`).
- **Idempotencia:** header `Idempotency-Key` en checkout/órdenes; por `eventId`
  con `storeId` en webhooks de pago.
- **Totales server-side:** el checkout recalcula subtotal/envío/impuestos; nunca
  confía en los totales del carrito (`orders/CreateOrderUseCase`).
- **Plugins de pago (Strategy + registry):** cada método (manual, Mercado Pago,
  futuros) implementa `PaymentProvider` y se registra en
  `PaymentProviderRegistry`; config por tienda en DB con cifrado **opcional**
  (`SETTINGS_ENCRYPTION_KEY`). Un método solo aparece en selectores si está
  habilitado **y** bien configurado.
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
- **Reutilizable, sin duplicar:** lo compartido vive en `@mitama/core` o en el
  módulo dueño del dominio. Antes de escribir un helper, busca si ya existe.
- **DRY con criterio:** prefiere duplicar 3 líneas a acoplar dos módulos;
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
yarn lint                   # ESLint, incluye boundaries entre módulos
yarn db:migrate             # prisma migrate dev — desarrollo
yarn db:deploy              # prisma migrate deploy — CI/producción
yarn db:reset               # resetea la DB de desarrollo
yarn db:seed                # permisos, roles, Super Admin (admin@mitama.local), tienda demo y datos de referencia
yarn new:module <nombre>    # genera un módulo nuevo con capas + test
```

## Cómo crear un módulo nuevo

1. `yarn new:module <nombre>` (kebab-case) y luego `yarn install`.
2. Registra `<Nombre>Module` en `apps/api/src/app.module.ts`.
3. Crea `packages/db/prisma/schema/<nombre>.prisma` y corre `yarn db:migrate`
   (las migraciones son versionadas; el baseline vive en
   `prisma/schema/migrations/`).
4. Reemplaza el adapter in-memory de `infra/` por uno de Prisma cuando toque
   persistir.
5. Patrones de referencia: `packages/modules/auth` (capas + tests in-memory) y
   `packages/modules/orders` (outbox, eventos, máquinas de estado, idempotencia).

## Testing

- Vitest en `packages/core` y en cada módulo. Los specs viven junto al código
  (`*.spec.ts`) y se excluyen del build.
- Los casos de uso se testean con adapters in-memory; nunca toques Prisma ni
  NestJS en un test unitario de application.
- Los e2e (`apps/api/test/*.e2e-spec.ts`) corren contra DB real en CI.

## Notas

- `README.md` es la portada pública del proyecto: no lo modifiques por cambios
  internos de scaffolding.
- El `.env` real nunca se versiona; `.env.example` documenta las variables.
- `SETTINGS_ENCRYPTION_KEY` es **opcional**: vacía → los settings de plugin se
  guardan/leen en plano; con valor → cifrado/descifrado transparente. La API
  arranca en ambos casos (no es fail-closed).
- La planeación viva está en `docs/ROADMAP.md`; las specs por requisito en
  `docs/specs/`. `AGENTS.md` y este archivo se mantienen idénticos.
</content>
