# Sprint 1 · r25 — CI/CD y Deploy VPS

> Estado: 🟡 parcial · Origen: PLAN_REFORCE_100 Fase 9 + PENDIENTES Fase 9 · Hito: F9
> Alcance transversal: `apps/api`, `apps/admin`, `apps/worker` (nuevo), `.github/`, `scripts/`

## Resumen

Poder desplegar el MVP en una máquina limpia con documentación y un script, y que
CI rojo bloquee merges. El deploy por Docker Compose está documentado y es
reproducible; CI y el script de deploy quedan pendientes.

## Entregado (primer corte)

- **Dockerfiles multi-stage:**
  - `apps/api/Dockerfile` (deps → build → runtime; `tini`, healthcheck a
    `/health`, usuario no-root, Prisma client incluido).
  - `apps/admin/Dockerfile` (deps → build → runtime con `output: standalone`;
    healthcheck a `/`).
- `next.config.ts`: `output: 'standalone'` + `outputFileTracingRoot` para el
  monorepo Yarn.
- `docker-compose.prod.yml`: servicios `api` y `admin`, healthchecks,
  `env_file: .env.production`; `postgres` opcional comentado (asume DB externa
  estilo Neon).
- `.dockerignore` raíz.
- `docs/DEPLOY.md`: guía paso a paso (preparar VPS, `.env.production`,
  `db:deploy`, `db:seed`, build/up, cron jobs para `dispatch-outbox` y
  `release-expired-reservations`, backup, reverse proxy con Caddy).

## Pendiente

- **`apps/worker/Dockerfile`** (multi-stage similar al API) y servicio `worker`
  en `docker-compose.prod.yml` cuando exista el worker dedicado (depende de
  [[sprint1_r24_outbox_worker_observability]]).
- **`scripts/deploy.sh`:** `git pull`; `yarn install --immutable` (o pull de
  imagen pre-buildeada); `yarn db:deploy`;
  `docker compose -f docker-compose.prod.yml up -d --build`; healthcheck
  post-deploy (`curl -fsSL .../health`); rollback básico si falla.
- **CI** (`.github/workflows/ci.yml`): job único con service
  `postgres:16-alpine`; `yarn install --immutable`, `yarn lint`, `yarn build`;
  `yarn db:deploy` + `yarn db:seed` sobre la DB del job; `yarn test` (incluye
  e2e); cache de Yarn y Turbo; pinear `actions/*` por SHA.
- **Imágenes a GHCR** (`ghcr.io/<org>/mitama-api`, `…/mitama-admin`) tagueadas
  por SHA y `latest`.
- Documentar `.env.production` completo (claves Mercado Pago reales,
  `CORS_ORIGINS`) en `.env.example`.

## Criterios de aceptación

- [ ] Un VPS limpio con Docker puede desplegar el MVP siguiendo el doc.
- [ ] CI rojo bloquea merge cuando: lint falla, build falla, migración falla,
      seed falla o tests fallan.
- [ ] `scripts/deploy.sh` corre limpio en un VPS y termina solo si los
      healthchecks pasan.
- [ ] Imagen `latest` reproducible desde el SHA del commit en CI.

## Estado

**Parcial:** Docker + `docker-compose.prod.yml` + `DEPLOY.md` entregados; faltan
CI, `scripts/deploy.sh`, `apps/worker/Dockerfile` e imágenes GHCR. Prioridad #5
entre las brechas bloqueantes del Sprint 1.
