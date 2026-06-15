# Sprint 1 · r21 — Hardening de la API

> Estado: ✅ entregado · Origen: PLAN_REFORCE_100 Fase 7 (API) · Hito: F7
> Alcance transversal: `apps/api`

## Resumen

Estándares mínimos de producción en la API: CORS por whitelist, Swagger detrás de
flag, CSP de Helmet, validación de envs críticas, `ValidationPipe` estricto y
rate limits por endpoint. Es la parte de API del hito F7; el hardening del admin
vive en [[sprint1_r22_admin_hardening]].

## Requisitos / estado entregado

- **CORS** (`enableCors`) con whitelist por env (`CORS_ORIGINS=` coma-separada o
  `*`; sin valor permite todo, recomendado solo en dev). **[hecho]**
- **Swagger** detrás de feature flag `API_DOCS_ENABLED=true`. **[hecho]**
- **CSP** estándar de Helmet cuando los docs están off; se desactiva solo si
  `API_DOCS_ENABLED=true`. **[hecho]**
- **Validación de envs** (`ConfigModule` con `validate` propio en
  `apps/api/src/config/env.ts`) para `DATABASE_URL`, `JWT_SECRET`,
  `JWT_REFRESH_SECRET`, `API_DOCS_ENABLED`; valida longitud mínima de secretos en
  `NODE_ENV=production`. **[hecho]**
- **`ValidationPipe`** `{ whitelist, transform, forbidNonWhitelisted }`. **[hecho]**
- **Rate limits** vía `@Throttle` y `ThrottlerModule.forRoot` con 4 throttlers
  nombrados: `default` 100/min; `auth` 10/min (30/min refresh, 5/min
  reset/forgot); `checkout` 20/min en `POST /orders`; `webhook` 60/min en
  `POST /payments/webhooks/:providerCode`. **[hecho]**
- **Helmet** + base de seguridad: `app.use(helmet({ contentSecurityPolicy:
  false }))` con CSP gestionada según el flag de docs. **[hecho]** Verificado:
  cabeceras `X-Content-Type-Options`, `X-Frame-Options`,
  `Strict-Transport-Security` presentes.
- **Health checks:** `GET /health` y `GET /health/db` (este último ejecuta
  `SELECT 1` vía `PrismaService`: 200 `{status:'ok'}` o 503 `{status:'down'}`);
  excluidos del prefijo de versión. **[hecho]**
- **Versionado del API `/v1`:** `app.setGlobalPrefix('v1', { exclude: ['health',
  'health/db'] })` + `.addServer('/v1')` en Swagger; el admin apunta a
  `${API_URL}/v1`. Los contratos públicos no se rompen, se versionan. **[hecho]**
  Verificado: rutas con prefijo responden, sin prefijo → 404; health sin prefijo.
- **Graceful shutdown** habilitado en el bootstrap de Nest. **[hecho]**

## Reglas de negocio

- `apps/api` no contiene lógica de negocio: solo registra módulos y configuración
  global (pipes, CORS, Swagger, throttlers).

## Criterios de aceptación

- [ ] CORS rechaza orígenes no listados.
- [ ] Swagger solo expuesto con `API_DOCS_ENABLED=true`.
- [ ] El arranque falla si faltan envs críticas o si un secreto es demasiado
      corto en producción.
- [ ] Un endpoint con payload fuera del DTO es rechazado (`forbidNonWhitelisted`).
- [ ] Los rate limits responden 429 al exceder el límite por endpoint.

## Estado

**Entregado** (sprint corto de hardening previo a Fase 4). La parte de admin
(cookies, CSP en `next.config.ts`, env obligatoria) queda en
[[sprint1_r22_admin_hardening]].
