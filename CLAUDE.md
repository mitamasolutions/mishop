# mitama-commerce — Guía para agentes

Plataforma open source (MIT) de ecommerce + POS para LATAM. Modular monolith
**hexagonal** en monorepo TypeScript estricto. Español-first: UI, docs y
mensajes de error en español; identificadores de código en inglés.

## Mapa del repo

```
apps/
  api/        # SOLO composición: bootstrap NestJS, registra módulos, Swagger en /docs
  admin/      # Next.js (App Router) + Tailwind v4 + shadcn/ui (puerto 3001)
packages/
  core/       # Shared kernel TS puro (CERO deps): Result, errores, EventBus, Entity/VO/UseCase
  contracts/  # Eventos e interfaces compartidas ENTRE módulos (+ token EVENT_BUS)
  db/         # Prisma multi-archivo (prisma/schema/<modulo>.prisma) + PrismaService/DbModule
  config/     # tsconfig base + ESLint compartido (incluye reglas de boundaries)
  modules/
    auth/     # Módulo de referencia: domain / application / infra / http
tools/        # new-module.mjs + plantillas del generador
```

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
   (`EventBus`, token `EVENT_BUS` de `@mitama/contracts`), no imports directos.
5. **`apps/api` no contiene lógica:** solo registra módulos NestJS y
   configuración global (pipes, CORS, Swagger).
6. La composición de cada módulo (puertos → adapters) vive en su
   `<modulo>.module.ts` en la raíz de `src/`, fuera de las capas.

## Principios de código

- **SOLID:** una responsabilidad por clase/caso de uso; dependencias por
  interfaces (puertos); extensión vía providers de NestJS.
- **Simple primero:** la solución más directa que cumpla. Nada de abstracciones
  especulativas ni patrones "por si acaso".
- **Reutilizable, sin duplicar:** lo compartido vive en `@mitama/core` o en el
  módulo dueño del dominio. Antes de escribir un helper, busca si ya existe.
- **DRY con criterio:** prefiere duplicar 3 líneas a acoplar dos módulos;
  la regla 3 siempre gana.

## Convenciones multi-canal e idempotencia (para fases futuras)

- Las **órdenes** llevarán campo `channel` (`web` | `pos` | ...) desde su
  primer schema.
- El **inventario** se modela por ubicación (`location`), nunca como un
  contador global por producto.
- Toda **mutación de escritura** de la API aceptará el header
  `Idempotency-Key`; con la misma clave se devuelve el resultado original sin
  re-ejecutar. Es la base del sync offline del POS.
- Hoy nada de esto está implementado: son decisiones de diseño que se respetan
  cuando toque cada fase.

## Comandos

```bash
docker compose up -d        # Postgres 16 local
corepack enable && yarn install
yarn build                  # turbo: build de todos los workspaces
yarn dev                    # API :3000 (/health, /docs) + Admin :3001
yarn test                   # Vitest (casos de uso con adapters in-memory)
yarn lint                   # ESLint, incluye boundaries entre módulos
yarn db:migrate             # prisma migrate dev (lee .env de la raíz)
yarn db:seed                # seed (vacío por ahora)
yarn new:module <nombre>    # genera un módulo nuevo con capas + test
```

## Cómo crear un módulo nuevo

1. `yarn new:module <nombre>` (kebab-case) y luego `yarn install`.
2. Registra `<Nombre>Module` en `apps/api/src/app.module.ts`.
3. Crea `packages/db/prisma/schema/<nombre>.prisma` y corre `yarn db:migrate`.
4. Reemplaza el adapter in-memory de `infra/` por uno de Prisma cuando toque
   persistir.
5. Patrón de referencia completo: `packages/modules/auth` y su test
   `register-user.use-case.spec.ts` (in-memory, sin Prisma).

## Testing

- Vitest en `packages/core` y en cada módulo. Los specs viven junto al código
  (`*.spec.ts`) y se excluyen del build.
- Los casos de uso se testean con adapters in-memory; nunca toques Prisma ni
  NestJS en un test unitario de application.

## Notas

- `README.md` es la portada pública del proyecto: no lo modifiques por cambios
  internos de scaffolding.
- El `.env` real nunca se versiona; `.env.example` documenta las variables.
