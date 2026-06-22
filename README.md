# mitama-commerce

> Plataforma open source de **ecommerce + punto de venta (POS)** enfocada en LATAM.
> Español-first · API-first · Multi-tienda · Multi-canal

Inspirada en la profundidad funcional de nopCommerce, construida con un stack
moderno: **NestJS · Prisma · PostgreSQL · Next.js**. Software libre (licencia
MIT): úsalo, modifícalo y monta tu negocio con él.

---

## ¿Qué puedes hacer hoy con mitama-commerce?

El **Sprint 1 está cerrado**: ya hay un MVP de ecommerce vendible operando
sobre API + panel de administración. Lo que ya funciona:

- 🛒 **Carrito y checkout** server-side (totales recalculados en el servidor,
  nunca se confía en lo que mande el cliente).
- 💳 **Pagos** con dos pasarelas listas para producción:
  - **Manual** (transferencia, depósito, efectivo) con confirmación desde el admin.
  - **Mercado Pago Checkout Pro** real, con webhooks firmados y reintentos.
- 📦 **Inventario por ubicación** con reservas tipo "claim-then-apply" (no se
  vende lo que no hay; se libera al cancelar o expirar la orden).
- 🏪 **Multi-tienda** desde el día 1 (varias tiendas en una misma instalación;
  por defecto opera en modo single-store).
- 🚚 **Envíos** con métodos por zona, tarifas server-side y tracking manual.
- 🧾 **Impuestos** con reglas por región y categoría (base lista para CFDI MX).
- 👥 **Clientes y direcciones** + checkout como invitado por email.
- 🧑‍💼 **Panel admin** completo: órdenes, clientes, pagos, envíos, productos
  con variantes, inventario, métodos de pago por tienda, tareas programadas,
  dashboard con KPIs reales.
- 🔐 **Auth robusta**: JWT con refresh en cookie HttpOnly, RBAC fail-closed,
  invitaciones, reset de contraseña, lockout, log de actividad.
- ⏰ **Tareas programadas in-app** (estilo nopCommerce): outbox, liberación de
  reservas, drenado de emails. Sin cron externo.
- 🔌 **Plugins de pago** (`payment_manual`, `payment_mercado_pago`) como
  paquetes independientes — agregar Stripe o PayPal es un módulo más, no un
  parche al core.

> Estado real y detallado en [`docs/ROADMAP.md`](./docs/ROADMAP.md).
> Próximo paso: **Sprint 2** (`apps/web` · tienda pública).

---

## ¿Por qué otro ecommerce open source?

Ya existen Medusa, Vendure y Saleor. Lo que no existe bien resuelto para LATAM:

- 🇲🇽 **Facturación CFDI** (México) como ciudadano de primera clase.
- 💳 **Mercado Pago y OXXO** nativos, no como plugin de tercera.
- 🗣️ **Español-first** en documentación, admin y comunidad.
- 🏪 **POS integrado y offline-first** — la venta no para cuando se cae el
  internet (planeado para el Sprint 3).

---

## Stack

| Capa             | Tecnología                                          |
| ---------------- | --------------------------------------------------- |
| Monorepo         | yarn workspaces + Turborepo                         |
| API              | NestJS · REST + OpenAPI/Swagger                     |
| ORM / DB         | Prisma · PostgreSQL 16                              |
| Admin            | Next.js (App Router) · Tailwind v4 · shadcn/ui      |
| Auth             | JWT + argon2 + cookies HttpOnly                     |
| Validación       | class-validator (DTOs estrictos en el borde HTTP)   |
| Tareas en background | Scheduler in-app (@nestjs/schedule + lock en DB) |
| Lenguaje         | TypeScript estricto                                 |

---

## Empezar en 5 minutos

Esta guía es para correr el proyecto en tu máquina por primera vez.

### Requisitos previos

- **Node.js 20+** ([instalar](https://nodejs.org/)).
- **Yarn 4** (lo activas con un solo comando: `corepack enable`).
- **Docker Desktop** para levantar Postgres local — alternativa: una base
  gratuita en [Neon](https://neon.tech).
- **Git** para clonar el repo.

### Paso 1 — Clona e instala

```bash
git clone https://github.com/mitama/mitama-commerce
cd mitama-commerce
corepack enable
yarn install
```

### Paso 2 — Crea tu `.env`

```bash
cp .env.example .env
```

Edita `.env` y asegúrate de tener estas variables (más detalle abajo):

```env
DATABASE_URL="postgresql://mitama:mitama@localhost:5432/mitama"
JWT_SECRET="cambia-esto-por-algo-largo-y-aleatorio"
JWT_REFRESH_SECRET="otro-secreto-distinto-y-largo"
SEED_ADMIN_PASSWORD="ponle-una-contraseña-fuerte"
```

> Genera secretos seguros con: `openssl rand -base64 32`.

### Paso 3 — Levanta PostgreSQL

Opción A (recomendada, con Docker):

```bash
docker compose up -d
```

Opción B: usa Neon (u otro Postgres administrado) — solo cambia el
`DATABASE_URL` en tu `.env` por el connection string que te dé el proveedor.

### Paso 4 — Crea las tablas y los datos iniciales

```bash
yarn db:migrate     # aplica el esquema a la base de datos
yarn db:seed        # crea roles, Super Admin, tienda demo y datos de referencia
```

### Paso 5 — Arranca el proyecto

```bash
yarn dev
```

- 🌐 **API:** http://localhost:3000 (Swagger en `/docs` si activas `API_DOCS_ENABLED=true`)
- 🛠️ **Admin:** http://localhost:3001

### Primer login en el admin

| Campo       | Valor                                          |
| ----------- | ---------------------------------------------- |
| Email       | `admin@admin.com`                              |
| Contraseña  | la que pusiste en `SEED_ADMIN_PASSWORD`        |

> ⚠️ **¿Ya habías sembrado la DB antes con otro correo?** El seed crea usuarios
> con `upsert` por email, así que no borra el anterior. Si necesitas empezar
> limpio: `yarn db:reset && yarn db:seed`.

---

## Variables de entorno

Toda la configuración vive en un `.env` en la raíz (no se commitea;
`.env.example` documenta cada variable).

### Obligatorias

| Variable               | Para qué sirve                                                              |
| ---------------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`         | Cadena de conexión a Postgres (local con Docker, Neon, RDS, etc.).          |
| `JWT_SECRET`           | Firma los access tokens del API. Mínimo 32 caracteres en producción.        |
| `JWT_REFRESH_SECRET`   | Firma los refresh tokens. **Debe ser distinto** a `JWT_SECRET`.             |
| `SEED_ADMIN_PASSWORD`  | Contraseña inicial del Super Admin (`admin@admin.com`) que crea el seed.    |

### Recomendadas / opcionales

| Variable                    | Para qué sirve                                                          |
| --------------------------- | ----------------------------------------------------------------------- |
| `API_PORT`                  | Puerto del API (default `3000`).                                        |
| `CORS_ORIGINS`              | Lista de dominios permitidos, separados por coma. Vacío = abierto.      |
| `API_DOCS_ENABLED`          | Activa Swagger UI en `/docs` (úsalo solo en dev o con auth externa).    |
| `DEFAULT_STORE_ID`          | Tienda usada cuando el request no envía `X-Store-Id` (modo single-store).|
| `NEXT_PUBLIC_API_URL`       | URL del API que consume el admin. Obligatoria en build de producción.   |
| `SETTINGS_ENCRYPTION_KEY`   | Cifra credenciales sensibles de plugins. **Obligatoria en producción**, opcional en dev/test. |

---

## Estructura del proyecto

```
mitama-commerce/
├── apps/
│   ├── api/        # NestJS — bootstrap, prefijo /v1, Swagger, ensamblaje de módulos
│   └── admin/      # Next.js (App Router) — panel de administración
├── lib/
│   ├── core/       # Shared kernel TS puro: Result<T,E>, EventBus, primitivas DDD
│   ├── contracts/  # Contratos compartidos entre features (eventos, puertos, pagos)
│   ├── db/         # Prisma multi-archivo, migraciones, PrismaService
│   └── config/     # tsconfig + ESLint base (incluye reglas de fronteras)
├── features/       # 17 features de negocio en UN paquete (@mitama/features)
│   └── src/        # auth · stores · catalog · inventory · cart · orders · payments · ...
├── plugins/
│   ├── payment_manual/         # Pago manual (transferencia, depósito, efectivo)
│   └── payment_mercado_pago/   # Mercado Pago Checkout Pro
├── docs/           # ROADMAP, specs por requisito, guía de deploy
├── tools/          # Generador de features (yarn new:feature <nombre>)
├── docker-compose.yml
└── turbo.json
```

---

## Arquitectura en pocas palabras

mitama-commerce es un **monolito modular hexagonal**: un solo deploy, pero cada
feature de negocio (auth, catalog, orders, payments…) vive aislada con sus
propias capas:

```
http → application → domain
                       ↑
                    infra  (implementa los puertos del dominio)
```

**Las 6 reglas inviolables** (las vigila ESLint en CI, no se negocian):

1. **Dependencias hacia adentro**: `http → application → domain`. El dominio
   no sabe que existe Prisma, Nest ni HTTP.
2. **Prisma SOLO en `infra/`** — los casos de uso dependen de puertos
   (interfaces), nunca del cliente Prisma.
3. **Una feature nunca importa internals de otra** — solo el barrel hermano
   (`../<feature>`) o `@mitama/contracts`.
4. **Comunicación entre features = eventos** del `EventBus` o puertos de
   `@mitama/contracts`. Cero imports directos.
5. **`apps/api` no contiene lógica** — solo registra módulos y configura cosas
   globales (validación de env, CORS, Helmet, Swagger).
6. **Multi-canal e idempotencia desde el día 1** — órdenes con `channel`
   (`web` | `pos`), inventario por ubicación, escrituras críticas aceptan
   `Idempotency-Key`.

Si vas a contribuir, lee también los patrones ya implementados en
[`AGENTS.md`](./AGENTS.md): outbox transaccional, máquinas de estado,
plugins de pago como Strategy, reservas claim-then-apply, etc.

---

## Comandos útiles

```bash
# Base de datos
yarn db:migrate     # Aplica migraciones en desarrollo
yarn db:deploy      # Aplica migraciones en CI/producción (sin prompts)
yarn db:reset       # Borra y recrea la DB de desarrollo (¡destructivo!)
yarn db:seed        # Carga permisos, roles, Super Admin (admin@admin.com), tienda demo

# Desarrollo
yarn dev            # API en :3000 + Admin en :3001 (con hot reload)
yarn build          # Build de todos los workspaces (turbo)
yarn lint           # ESLint en todo el monorepo (incluye fronteras entre features)
yarn test           # Vitest: unit tests (in-memory) + e2e (DB real)

# Generadores
yarn new:feature <nombre>   # Genera una feature nueva con capas + tests
```

---

## Roadmap (estado real)

### ✅ Sprint 1 — MVP ecommerce (API + Admin) · CERRADO

Plataforma vendible end-to-end: auth, productos con variantes, inventario por
ubicación, carrito, checkout, pagos manual + Mercado Pago, envíos, impuestos,
panel admin completo, tareas programadas, deploy con Docker Compose.

### 🚧 Sprint 2 — Storefront público (`apps/web`) · EN PLANEACIÓN

Tienda pública que consume el catálogo y checkout ya existentes:

- Home, listados con filtros, detalle de producto, carrito, checkout guiado.
- Guest checkout por email.
- SEO real (slugs, redirects, meta), integración con Mercado Pago.
- (Opcional) Descongelar promotions / gift cards / reviews y cablearlos.

### 🔜 Sprint 3 — Extensión POS

Punto de venta offline-first (`apps/pos`):

- Sucursales y transferencias de stock como entidad de primera clase.
- App de caja PWA con escaneo de código de barras, cobro mixto, ticket térmico.
- Base local en dispositivo + sync por eventos con `Idempotency-Key`.
- Apertura/cierre de caja, múltiples cajeros, cortes X/Z.

### 🔜 Sprint 4 — Paridad nopCommerce extendida

Por prioridad: **CFDI 4.0 México**, multi-idioma/moneda, RMA, multi-vendor,
CMS ligero, webhooks públicos, reportes avanzados, GDPR/LFPDPPP.

> Detalle completo, specs por requisito y estado por módulo en
> [`docs/ROADMAP.md`](./docs/ROADMAP.md).

---

## Documentación adicional

- 📋 [`docs/ROADMAP.md`](./docs/ROADMAP.md) — Planeación viva y estado por sprint.
- 📦 [`docs/DEPLOY.md`](./docs/DEPLOY.md) — Cómo desplegar en un VPS con Docker.
- 📐 [`docs/specs/`](./docs/specs/) — Specs detalladas por requisito.
- 🤖 [`AGENTS.md`](./AGENTS.md) — Reglas y patrones para agentes/contribuidores.
- 🤝 [`CONTRIBUTING.md`](./CONTRIBUTING.md) — Cómo contribuir código.

---

## Contribuir

Lee [`CONTRIBUTING.md`](./CONTRIBUTING.md). En corto:

- Conventional commits.
- Cada feature nueva se genera con `yarn new:feature <nombre>`.
- Las reglas de arquitectura no se negocian — el CI las vigila.

**¿No programas pero quieres ayudar?** Abrir un
[issue](https://github.com/mitama/mitama-commerce/issues) reportando un bug,
sugiriendo una mejora o pidiendo soporte para tu pasarela de pago local también
es contribuir.

---

## Licencia

[MIT](./LICENSE) — úsalo, modifícalo y monta tu negocio con él.

---

## Glosario rápido (para quienes apenas están aprendiendo)

- **API** — Servidor que expone funcionalidad por HTTP para que otros sistemas
  (un admin, una tienda, una app móvil) la consuman. Aquí, `apps/api`.
- **Monorepo** — Un solo repositorio Git que contiene varios proyectos
  relacionados (API, admin, librerías, plugins) que comparten dependencias y
  herramientas.
- **Modular monolith** — Un único deploy, pero con módulos internos tan
  aislados que mañana podrías separarlos en microservicios sin reescribir el
  dominio.
- **Hexagonal (puertos y adapters)** — El "qué hace el negocio" vive en el
  centro (domain) y las decisiones técnicas (Prisma, HTTP, Mercado Pago) viven
  en los bordes (infra), conectadas por **puertos** (interfaces).
- **Seed** — Script que carga datos iniciales en la base (roles, usuario admin,
  tienda demo) para que arranques con algo usable.
- **Migración** — Archivo SQL versionado que evoluciona el esquema de la base
  de datos de forma reproducible. Nunca se edita una migración ya aplicada.
- **Idempotencia** — Que enviar la misma operación dos veces produzca el mismo
  resultado, no dos resultados. Clave para reintentos y para el POS offline.
- **Outbox** — Patrón que guarda los eventos a publicar en la misma transacción
  que los datos. Garantiza "si la orden se creó, su evento se publicará" — sin
  perder eventos por caídas.
- **RBAC** — Role-Based Access Control: a los usuarios se les asignan roles, y
  los roles tienen permisos. "Fail-closed" significa que sin permiso explícito,
  la respuesta es **denegado**.
- **Multi-tienda / Multi-canal** — Una instalación puede operar varias tiendas
  (cada una con su catálogo, métodos de pago y envío); cada venta sabe si vino
  por **web** o **POS** (canal).
