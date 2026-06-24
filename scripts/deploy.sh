#!/usr/bin/env bash
#
# scripts/deploy.sh — Despliegue reproducible para VPS con Docker Compose.
# r25 · sprint1_cierre.
#
# Flujo:
#   1. git pull (asume rama 'main' y working tree limpio).
#   2. yarn install --immutable + yarn build (necesario para db:deploy local).
#   3. yarn db:deploy (aplica migraciones Prisma idempotentes).
#   4. docker compose -f docker-compose.prod.yml up -d --build (api + admin).
#   5. Healthcheck con backoff. Si falla, rollback al commit anterior y
#      re-up del compose con la imagen previa.
#
# Idempotente y fail-closed: el script aborta a la primera falla (set -euo
# pipefail). El operador puede correrlo varias veces sin riesgo.
#
# Variables opcionales (con defaults sensatos):
#   COMPOSE_FILE=docker-compose.prod.yml
#   API_HEALTH_URL=http://127.0.0.1:3000/health
#   ADMIN_HEALTH_URL=http://127.0.0.1:3001/
#   HEALTH_RETRIES=12          (intentos)
#   HEALTH_INTERVAL=5          (segundos entre intentos)

set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
API_HEALTH_URL="${API_HEALTH_URL:-http://127.0.0.1:3000/health}"
ADMIN_HEALTH_URL="${ADMIN_HEALTH_URL:-http://127.0.0.1:3001/}"
HEALTH_RETRIES="${HEALTH_RETRIES:-12}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-5}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

log() { printf "\033[1;36m[deploy]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[deploy:ERROR]\033[0m %s\n" "$*" >&2; }

# ── 0. Validar prerequisitos ────────────────────────────────────────────────
if [[ ! -f "$COMPOSE_FILE" ]]; then
  err "No se encuentra $COMPOSE_FILE en $REPO_ROOT"
  exit 1
fi
if [[ ! -f ".env.production" ]]; then
  err "Falta .env.production (copia .env.example y completa los secretos)"
  exit 1
fi

# Guardar el commit actual para rollback.
PREVIOUS_SHA="$(git rev-parse HEAD)"
log "Commit actual: $PREVIOUS_SHA"

# ── 1. git pull ─────────────────────────────────────────────────────────────
log "Actualizando código (git pull)…"
git pull --ff-only

NEW_SHA="$(git rev-parse HEAD)"
if [[ "$NEW_SHA" == "$PREVIOUS_SHA" ]]; then
  log "Sin cambios nuevos; igual aplico migraciones y reinicio."
fi

# ── 2. Dependencias + build (Prisma generate requiere build mínimo) ─────────
log "Instalando dependencias…"
corepack enable
yarn install --immutable

log "Generando cliente Prisma…"
yarn workspace @mitama/data db:generate

# ── 3. Migraciones DB ───────────────────────────────────────────────────────
log "Aplicando migraciones de Prisma (db:deploy)…"
yarn workspace @mitama/data db:deploy

# ── 4. Levantar servicios con build ─────────────────────────────────────────
log "Levantando contenedores (api + admin)…"
docker compose -f "$COMPOSE_FILE" up -d --build

# ── 5. Healthcheck con backoff ──────────────────────────────────────────────
healthcheck_url() {
  local url="$1"
  local label="$2"
  for ((i = 1; i <= HEALTH_RETRIES; i++)); do
    if curl -fsSL --max-time 5 -o /dev/null "$url"; then
      log "$label OK ($url)"
      return 0
    fi
    log "$label aún no responde (intento $i/$HEALTH_RETRIES)… espera ${HEALTH_INTERVAL}s"
    sleep "$HEALTH_INTERVAL"
  done
  err "$label NO respondió tras $HEALTH_RETRIES intentos"
  return 1
}

if ! healthcheck_url "$API_HEALTH_URL" "API"; then
  err "Healthcheck de API falló. Iniciando rollback…"
  git reset --hard "$PREVIOUS_SHA"
  yarn install --immutable
  yarn workspace @mitama/data db:generate
  docker compose -f "$COMPOSE_FILE" up -d --build
  err "Rollback aplicado. Revisa logs: docker compose -f $COMPOSE_FILE logs api"
  exit 1
fi

if ! healthcheck_url "$ADMIN_HEALTH_URL" "Admin"; then
  err "Healthcheck del Admin falló (la API responde OK). Revisa logs sin rollback."
  exit 1
fi

log "Despliegue OK · API + Admin saludables · commit=$NEW_SHA"
