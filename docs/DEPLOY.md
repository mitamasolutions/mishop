# Deploy en VPS con Docker Compose

Guía operativa para correr mitama-commerce en un VPS (Hetzner, DigitalOcean,
Contabo, etc.). Asume Docker y Docker Compose v2 ya instalados en el host.

## 1. Preparar el VPS

- Crear usuario no-root con permiso a Docker (`docker` group).
- Abrir puertos `3000` (API) y `3001` (Admin) en el firewall. En producción
  real se recomienda poner ambos detrás de un reverse-proxy con TLS
  (Caddy/Traefik/Nginx) y exponer solo `80`/`443`.
- (Opcional) Configurar un dominio: `api.tudominio.com` → `:3000`,
  `admin.tudominio.com` → `:3001`.

## 2. Clonar el repo y preparar `.env.production`

```bash
git clone https://github.com/<tu-org>/mitama-commerce.git
cd mitama-commerce
cp .env.example .env.production
```

Edita `.env.production`. Variables **obligatorias**:

```dotenv
# Base de datos (Neon u otro Postgres administrado recomendado)
DATABASE_URL=postgresql://usuario:password@host/db?sslmode=require

# Auth — generar con `openssl rand -base64 32`
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# Seed inicial (solo primer arranque; rotar después)
SEED_ADMIN_PASSWORD=...

# CORS: lista coma-separada de origenes permitidos
CORS_ORIGINS=https://admin.tudominio.com

# URL pública de la API. **Obligatoria** para el build de producción del
# admin (sin fallback a localhost · r22).
NEXT_PUBLIC_API_URL=https://api.tudominio.com
```

Variable **obligatoria** en producción:

```dotenv
# Cifrado de settings sensibles, incluidas credenciales de plugins de pago.
SETTINGS_ENCRYPTION_KEY=...
```

Las credenciales de Mercado Pago **NO van en `.env`**: se configuran por
tienda desde el admin (`/configuracion/pagos`) y se persisten cifradas en
DB con `SETTINGS_ENCRYPTION_KEY` (`store_payment_methods.encrypted_credentials`).

## 3. Primer despliegue

```bash
# Migraciones + seed
yarn install --immutable
yarn workspace @mitama/db db:deploy
yarn workspace @mitama/db db:seed

# Arrancar API + Admin
docker compose -f docker-compose.prod.yml up -d --build
```

El admin queda en `:3001`, la API en `:3000` con healthcheck en `/health`.

## 4. Despliegues subsiguientes

Usa `scripts/deploy.sh`, que aplica el flujo idempotente:

```bash
./scripts/deploy.sh
```

Hace `git pull` → `yarn install --immutable` → `prisma generate` →
`prisma migrate deploy` → `docker compose up -d --build` → healthcheck con
backoff. Si la API no responde tras 12 intentos (60s), aplica
**rollback automático** al commit previo y reinicia. Variables ajustables:
`API_HEALTH_URL`, `ADMIN_HEALTH_URL`, `HEALTH_RETRIES`, `HEALTH_INTERVAL`.

## 5. Operación periódica (sin cron externo · r24)

A partir del cierre del Sprint 1, las tareas periódicas viven **dentro de
la API** como subsistema de tareas programadas estilo nopCommerce. NO hay
que registrar cronjobs en el host. Las tareas por defecto son:

| Tarea                            | Tipo                          | Intervalo |
|----------------------------------|-------------------------------|-----------|
| Despacho de outbox               | `dispatch-outbox`             | 60 s      |
| Drenado de cola de emails        | `drain-email-queue`           | 60 s      |
| Liberación de reservas vencidas  | `release-expired-reservations`| 300 s     |

Se administran desde el admin en `/tareas-programadas` (solo **Super
Admin**): habilitar/deshabilitar, editar intervalo, "ejecutar ahora" y ver
el último resultado/error.

Asunción operativa: **una sola instancia de API**. El lock por fila evita
que una tarea se solape consigo misma; correr múltiples réplicas requiere
extender el runner con un lock global (Postgres `pg_advisory_lock` u otro)
y queda fuera del MVP.

## 6. Imágenes en GHCR

El workflow de CI publica imágenes en cada push a `main` con dos tags:

- `ghcr.io/<owner>/mitama-commerce-api:sha-<corto>` y `:latest`
- `ghcr.io/<owner>/mitama-commerce-admin:sha-<corto>` y `:latest`

Para usarlas en lugar de building local, edita `docker-compose.prod.yml`
y reemplaza `build:` por `image: ghcr.io/<owner>/mitama-commerce-api:latest`
(o un SHA específico). Recuerda `docker login ghcr.io` con un PAT con
scope `read:packages`.

## 7. Backups

Si usas Neon, los backups son automáticos. Si corres Postgres en el mismo
host (descomentando el servicio del compose), agenda un cron con
`pg_dump`:

```cron
0 3 * * * docker exec mitama-postgres pg_dump -U mitama mitama | gzip > /backups/mitama-$(date +\%F).sql.gz
```

## 8. Reverse proxy con TLS (Caddy ejemplo)

`Caddyfile`:

```caddyfile
api.tudominio.com {
  reverse_proxy localhost:3000
}

admin.tudominio.com {
  reverse_proxy localhost:3001
}
```

Caddy resuelve TLS por Let's Encrypt automáticamente. Para Traefik/Nginx,
adaptar la configuración con `proxy_pass` o labels.

## 9. Webhooks de pago

Los webhooks de Mercado Pago se reciben en una URL **tenant-scoped**:

```
POST https://api.tudominio.com/v1/payments/webhooks/<storeId>/mercado-pago
```

Cada tienda configura su propio `webhookSecret` desde el admin y registra
esa URL en su panel de Mercado Pago. La firma HMAC-SHA256 se valida antes
de parsear el cuerpo (r14 · sprint1_cierre).
