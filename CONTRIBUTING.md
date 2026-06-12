# Contribuir a mitama-commerce

¡Gracias por tu interés! Este documento explica cómo trabajar en el repo.

## Setup local

```bash
docker compose up -d        # PostgreSQL 16 local
corepack enable             # habilita Yarn 4
yarn install
cp .env.example .env        # ajusta valores si hace falta
yarn db:migrate && yarn db:seed
yarn dev                    # API en :3000 (/docs) + Admin en :3001
```

## Commits: Conventional Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/es/):

```
<tipo>(<área>): <descripción en minúsculas>

feat(auth): agrega refresh tokens
fix(catalog): corrige cálculo de stock por ubicación
docs: actualiza guía de módulos
chore(deps): actualiza prisma a 6.x
```

Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`. El área es el
módulo o paquete afectado (`auth`, `db`, `admin`, `api`, `core`...).

## Cómo crear un módulo nuevo

```bash
yarn new:module pagos
yarn install
```

El generador crea `packages/modules/pagos` con las capas completas
(`domain → application → infra → http`), un caso de uso de ejemplo y su test
in-memory. Después:

1. Registra `PagosModule` en `apps/api/src/app.module.ts`.
2. Crea su schema en `packages/db/prisma/schema/pagos.prisma` y corre `yarn db:migrate`.
3. Reemplaza el adapter in-memory de `infra/` por uno de Prisma cuando necesites persistencia.

## Reglas de arquitectura (no negociables — el CI las vigila)

1. **Dependencias hacia adentro:** `http → application → domain`. `infra`
   implementa interfaces de `domain`. `domain` no importa nada externo.
2. **Prisma solo en `infra/`:** los casos de uso dependen de puertos
   (interfaces), nunca del cliente Prisma.
3. **Cero imports de internals:** un módulo solo importa el `index.ts` público
   de otro (`@mitama/<modulo>`) o `@mitama/contracts`. ESLint lo hace fallar.
4. **Comunicación entre módulos por eventos** del bus de `@mitama/core`,
   no imports directos.
5. **`apps/api` no contiene lógica:** solo composición y configuración global.

## Principios de código

- **SOLID:** una responsabilidad por clase/caso de uso; dependencias por interfaces.
- **Simple primero:** la solución más directa que cumpla; sin abstracciones especulativas.
- **Reutilizable, sin duplicar:** lo compartido vive en `@mitama/core` o en el
  módulo dueño del dominio. Antes de escribir un helper, busca si ya existe.
- **DRY con criterio:** mejor duplicar 3 líneas que acoplar dos módulos.

## Tests

- Cada caso de uso se testea con adapters in-memory (sin Prisma ni NestJS).
  El patrón de referencia está en
  `packages/modules/auth/src/application/register-user/register-user.use-case.spec.ts`.
- `yarn test` debe pasar antes de abrir un PR.

## Flujo de PR

1. Crea una rama desde `main` (`feat/...`, `fix/...`).
2. Asegúrate de que `yarn lint && yarn build && yarn test` pasen en local.
3. Abre el PR con descripción clara; el CI corre lint + build + test.
