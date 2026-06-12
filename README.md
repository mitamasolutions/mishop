# mitama-commerce

> Plataforma open source de **ecommerce + punto de venta (POS)** enfocada en LATAM.
> Español-first · API-first · Multi-tienda · Multi-canal

Inspirada en la profundidad funcional de nopCommerce, construida con un stack moderno: **NestJS · Prisma · PostgreSQL · Next.js**.

**🇺🇸 English:** Open source ecommerce + point-of-sale platform focused on LATAM. Spanish-first docs and admin, API-first architecture, multi-store and multi-channel by design. Full English docs coming soon — contributions welcome.

---

## ¿Por qué otro ecommerce open source?

Ya existen Medusa, Vendure y Saleor. Lo que no existe bien resuelto para LATAM:

- 🇲🇽 **Facturación CFDI** (México) como ciudadano de primera clase
- 💳 **Mercado Pago y OXXO** nativos, no como plugin de tercera
- 🗣️ **Español-first** en documentación, admin y comunidad
- 🏪 **POS integrado y offline-first** — la venta no para cuando se cae el internet

## Stack

| Capa     | Tecnología                                  |
| -------- | ------------------------------------------- |
| Monorepo | yarn workspaces + Turborepo                 |
| API      | NestJS · REST + OpenAPI/Swagger             |
| ORM / DB | Prisma · PostgreSQL                         |
| Admin    | Next.js (App Router) · Tailwind · shadcn/ui |
| Lenguaje | TypeScript estricto                         |

## Arquitectura

Modular monolith **hexagonal**: cada dominio de negocio es un paquete independiente del workspace con sus capas `domain → application → infra → http`. Los módulos se comunican solo por eventos (`packages/core/events`) o contratos públicos (`packages/contracts`) — nunca por imports internos.

```
mitama-commerce/
├── apps/
│   ├── api/          # Composición: bootstrap NestJS, ensambla módulos, Swagger
│   ├── admin/        # Panel de administración (Next.js + shadcn/ui)
│   └── pos/          # (futuro) Punto de venta offline-first
├── packages/
│   ├── core/         # Shared kernel: Result<T,E>, eventos, primitivas DDD
│   ├── modules/      # Un paquete por dominio: auth, stores, catalog, orders...
│   ├── contracts/    # Eventos e interfaces compartidas entre módulos
│   ├── db/           # Prisma (schema multi-archivo, un .prisma por módulo)
│   └── config/       # tsconfig y eslint base
├── docker-compose.yml
└── turbo.json
```

**Reglas inviolables**

1. Dependencias siempre hacia adentro: `http → application → domain`.
2. Prisma solo vive en `infra/`; los casos de uso dependen de puertos (interfaces).
3. Ningún módulo importa internals de otro (ESLint lo hace fallar en CI).
4. Comunicación entre módulos: eventos, no imports.
5. `apps/api` no contiene lógica de negocio.
6. Preparado para multi-canal: órdenes con `channel`, inventario por ubicación, mutaciones con `Idempotency-Key`.

## Setup local

```bash
git clone https://github.com/mitama/mitama-commerce
cd mitama-commerce
cp .env.example .env        # configura tu DATABASE_URL (ver abajo)
yarn install
yarn db:migrate && yarn db:seed
yarn dev                    # API en :3000 (/docs) + Admin en :3001
```

## Variables de entorno

Toda la configuración vive en un `.env` en la raíz (nunca se commitea; `.env.example` documenta cada variable). El proyecto es agnóstico al proveedor de PostgreSQL: solo cambia el `DATABASE_URL`.

**Opción A — Postgres local con Docker** (recomendada para contribuidores)

```bash
docker compose up -d
```

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mitama?schema=public"
```

**Opción B — Neon (u otro Postgres administrado)**

```env
DATABASE_URL="postgresql://<user>:<password>@<endpoint>.neon.tech/mitama?sslmode=require"
```

Con Neon no necesitas levantar Docker. Tip: usa el branching de Neon para tener una rama de base de datos por feature sin tocar la principal.

**Otras variables principales**

```env
# apps/api
JWT_SECRET="cámbiame"
JWT_REFRESH_SECRET="cámbiame-también"
API_PORT=3000

# apps/admin
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

Puedes combinar ambas opciones: Docker para desarrollo del día a día y Neon para staging/producción — es literalmente cambiar una línea del `.env`.

## Roadmap

### Hito 1 — Ecommerce base funcional

- [ ] **Fase 1 · Fundación** — Auth (JWT + roles/ACL), multi-tienda, settings global/por tienda, log de actividad, layout base del admin.
- [ ] **Fase 2 · Catálogo** — Productos con variantes/atributos, categorías, fabricantes, imágenes, precios. Inventario por ubicación desde el inicio. Búsqueda y filtros en admin.
- [ ] **Fase 3 · Ventas** — Clientes y direcciones, carrito, checkout, órdenes con canal y estados, idempotencia en creación de órdenes, gestión de órdenes en admin.
- [ ] **Fase 4 · Pagos y envíos** — Arquitectura de providers tipo plugin. Adapters iniciales: Mercado Pago, Stripe, pago manual. Métodos y tarifas de envío. Impuestos (IVA México).
- [ ] **Fase 5 · Marketing básico** — Descuentos y cupones, reviews de producto, emails transaccionales.

> ✅ Al cerrar la Fase 5 hay un ecommerce operable de punta a punta vía API + admin.

### Hito 2 — Extensión POS

- [ ] **Fase 6 · Inventario avanzado** — Sucursales/ubicaciones como entidad de primera clase, transferencias, ajustes de stock, conteos físicos, alertas de stock bajo. _Prerequisito duro del POS._
- [ ] **Fase 7 · POS core** — App de caja (`apps/pos`): búsqueda rápida, escaneo de código de barras, venta con canal `pos`, cobro efectivo/tarjeta/mixto, cálculo de cambio, ticket térmico, devoluciones.
- [ ] **Fase 8 · Offline-first y sync** — Base local en dispositivo, cola de operaciones, sync por eventos con claves de idempotencia, resolución de conflictos de stock.
- [ ] **Fase 9 · Operación de tienda física** — Apertura/cierre de caja, cortes (arqueo), múltiples cajeros con permisos, reportes por caja/cajero/turno.

### Transversales (crecen en cada fase)

Reportes y dashboard · Facturación CFDI (post Fase 4) · Multi-idioma y multi-moneda · Webhooks públicos · Import/export · Documentación para contribuidores.

## Contribuir

Lee [CONTRIBUTING.md](./CONTRIBUTING.md). En corto: conventional commits, cada módulo nuevo se genera con `yarn new:module <nombre>`, y las reglas de arquitectura no se negocian — el CI las vigila.

## Licencia

[MIT](./LICENSE) — úsalo, modifícalo y monta tu negocio con él.
