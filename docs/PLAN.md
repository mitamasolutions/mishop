# Plan de desarrollo — mitama-commerce

Objetivo: replicar la profundidad funcional de **nopCommerce** (ecommerce) y extenderla con **POS offline-first**, manteniendo estabilidad y robustez de nivel producción en cada fase.

Regla madre: **ninguna fase se cierra sin cumplir su Definition of Done.** Avanzar rápido con bases frágiles es lo que mata estos proyectos.

---

## Estado real al 2026-06-13 (verificación)

> Reconciliación entre el plan y el código en disco. Leyenda de marcas:
> `[x]` hecho y verificado en runtime · `[~]` código completo pero **sin
> verificar** (bloqueado o sin e2e) · `[ ]` no iniciado.

**Lo que sí corre hoy:** la API arranca, mapea 142 rutas, la DI resuelve sin
errores, `POST /auth/login` funciona contra la DB real y el flujo de catálogo
(crear producto → variante → precio base) responde 200. Fase 1 y el grueso de
Fase 2 están operativos.

**Drift de DB — RESUELTO 2026-06-13:** el schema definía 13 tablas de Fase 3 y
la columna `inventory_levels.version` que la DB `mishop` nunca sincronizó →
inventario y ventas daban 500 (P2022). Se corrió `prisma db push` (diff 100%
aditivo). **Tras el push, el flujo cart→order se verificó end-to-end:** orden
`WEB-000001` creada (total 49700 = 2×199 + 99 envío), **stock reservado
correctamente** (`reservedQuantity:2`, `availableQuantity:48` — lock optimista
en uso), `Idempotency-Key` obligatorio. Recordatorio: editar cualquier
`.prisma` exige `db push` o el runtime rompe (no hay migraciones).

**Defecto de idempotencia de órdenes — RESUELTO Y VERIFICADO 2026-06-13:** en
`CreateOrderUseCase.execute()` el chequeo de carrito-listo corría **antes** que
el lookup de `Idempotency-Key`; como crear la orden marca el carrito como
ordenado, un reintento con la misma clave devolvía 400 en vez de la orden
original. **Fix aplicado:** el lookup de idempotencia se movió al inicio,
resolviendo el `storeId` con un nuevo método del puerto `CheckoutCartReader`
(`getCartStoreId`, en cualquier estado). De paso se corrigió el adapter
in-memory para modelar fielmente "carrito ordenado → no listo" (el test pasaba
en falso). **Verificado por HTTP:** replay → 201 con el mismo order id, sin
doble reserva de stock; misma key con otro cart → 409. Spec:
`docs/spec/f3-fix-idempotencia-ordenes.md`. Es el molde de los webhooks de pago
(Fase 4).

**Divergencia plan ↔ implementación:** se construyó el módulo `reference-data`
(countries / currencies / regions / territories / zones) que el plan no lista
en ninguna fase explícita — es andamiaje para zonas de envío (Fase 4) y
multi-moneda (Hito 3). Conviene reflejarlo. Además ya existe la ruta
`GET /payment-providers` y el seed carga 7 providers: hay andamiaje temprano
de Fase 4.

**Brechas transversales del DoD aún no implementadas (ver Principios):**
sin logs estructurados (pino) ni correlation-id, sin READMEs por módulo, y el
seed no carga productos ni inventario demo.

---

## Hardening previo a Fase 4 — RESUELTO Y VERIFICADO 2026-06-14

Sprint corto de 4 tareas antes de iniciar Fase 4 (decisión del usuario:
"hardening corto primero"). Las 4 quedaron resueltas y verificadas en runtime
contra la DB real:

- **helmet + rate-limiting:** `app.use(helmet({ contentSecurityPolicy: false }))`
  en `main.ts` + `ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])` con
  `ThrottlerGuard` como `APP_GUARD`. _Verificado: cabeceras
  `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`
  presentes; `/docs` (Swagger) sigue cargando; 105 req/min →
  99×`200` + 6×`429`._
- **`/health/db`:** `GET /health/db` ejecuta `SELECT 1` vía `PrismaService`,
  200 `{status:'ok'}` o 503 `{status:'down'}`. _Verificado: 200._
- **Versionado `/v1`:** `app.setGlobalPrefix('v1', { exclude: ['health', 'health/db'] })`
  + `.addServer('/v1')` en Swagger; `apps/admin/src/lib/api-client.ts` ahora
  apunta a `${API_URL}/v1`. _Verificado: `/v1/auth/login` y `/v1/stores`
  responden con datos reales; `/auth/login` y `/stores` (sin prefijo) → 404;
  `/health` y `/health/db` siguen sin prefijo._
- **Test de carrera de inventario:** ver Fase 3 arriba.

CI completa (`yarn lint && yarn build && yarn test`) en verde, incluyendo el
nuevo e2e. **El proyecto queda listo para iniciar Fase 4** (el primer módulo se
elige en otra sesión).

---

## 0. Principios de estabilidad (aplican a TODAS las fases)

**Definition of Done de cada fase:**

- [ ] Tests unitarios de todos los casos de uso (repos in-memory, sin DB)
- [ ] Tests e2e de los endpoints del módulo (DB real vía Docker en CI)
- [ ] Migraciones Prisma **aditivas y reversibles** (nunca borrar columnas en la misma release que deja de usarlas)
- [ ] Validación de entrada en el borde HTTP (DTOs con class-validator/zod) — nada entra sin validar
- [ ] Errores como `Result<T,E>`; ninguna excepción de dominio sin tipar
- [ ] Swagger actualizado y seed demo cubriendo el módulo
- [ ] Log de actividad para toda mutación admin
- [ ] Documentación del módulo (README propio en su paquete)
- [ ] CI verde: lint + build + test + regla de fronteras entre módulos

**Prácticas transversales desde el día 1:**

- Logs estructurados (pino) con correlation-id por request
- Health checks (`/health`, `/health/db`) y graceful shutdown
- Rate limiting y helmet en el API
- Versionado del API (`/v1`) — los contratos públicos no se rompen, se versionan
- Releases con changesets + semver; CHANGELOG generado
- Backups: documentar estrategia (Neon PITR / pg_dump en Docker)
- Toda escritura crítica acepta `Idempotency-Key`

---

## HITO 1 — Ecommerce base funcional

### Fase 0 · Scaffolding ✅ (prompt inicial)

Monorepo, core kernel, módulo ejemplo, admin base, CI, generador de módulos, CLAUDE.md/AGENTS.md.

### Fase 1 · Fundación [DONE]

_Equivalencia nopCommerce: Customers/Roles, ACL, Multi-store, Settings, Activity Log_

**Módulos:** `auth`, `stores`, `settings`, `activity-log`

- [x] Auth: login email+contraseña, JWT access + refresh con rotación, bloqueo por intentos, recuperación de contraseña, invitación de usuarios
- [x] ACL granular: permisos por recurso/acción, roles predefinidos + roles personalizados, guard `@RequirePermission()`
- [x] Multi-tienda: CRUD de stores, usuario↔tienda con rol por tienda, scoping automático por `store_id` en todas las queries (middleware Prisma)
- [x] Settings tipados en 2 niveles (global / por tienda) con cache e invalidación por evento
- [x] Activity log: quién, qué, sobre qué entidad, cuándo, desde qué IP
- [x] Admin: login, layout (sidebar, selector de tienda, dark mode), CRUD de usuarios/roles/tiendas/settings
- [x] Seed: super admin + tienda demo

**Riesgo a vigilar:** el scoping multi-tienda. Si una query se escapa sin `store_id`, es fuga de datos entre tiendas. Test específico que lo verifique.

### Fase 2 · Catálogo

_Equivalencia nopCommerce: Products, Categories, Manufacturers, Attributes, Specifications, Tier Prices, Related Products, Tags, Inventory/Warehouses_

**Módulos:** `catalog`, `inventory`, `media`

- [x] Productos: simples y con variantes (combinaciones de atributos), SKU/GTIN/código de barras por variante
- [x] Atributos de producto (talla, color...) y atributos de especificación (filtrables)
- [x] Categorías jerárquicas (árbol con drag & drop en admin) y fabricantes/marcas
- [x] Precios: precio base, precio de oferta con vigencia, tier prices (precio por cantidad), costo (para márgenes y POS)
- [~] Inventario **por ubicación**: módulo `inventory` con items/levels/locations y reservas (`stock_reservations`); lock optimista (`version`) modelado. **Bloqueado por drift de DB** (escribir nivel de stock da 500). Backorder/umbral existen como flags de variante.
- [ ] Media: subida de imágenes (S3-compatible/cloudinary/local), orden, alt text, imagen por variante. **No iniciado** — existe `media.prisma` pero no hay módulo `media`.
- [~] Tags de producto (`product-tags` CRUD). **Productos relacionados y cross-sell: no implementados.**
- [~] SEO por producto: `handle` (slug), `metaTitle`/`metaDescription` en producto. **Slug único, redirects al cambiar slug y SEO de categoría: faltan.**
- [x] Búsqueda y filtros en endpoints de listado (productos, inventario, etc.)
- [ ] Import/export CSV de productos (lo pedirá todo el mundo)

**Riesgo a vigilar:** el modelo de variantes. Estudiar schemas de Medusa/Saleor ANTES de escribir el .prisma. Es la decisión más cara de revertir de todo el proyecto.

### Fase 3 · Ventas

_Equivalencia nopCommerce: Customers (compradores), Shopping Cart, Checkout, Orders, Order Notes, Returns (base)_

**Módulos:** `customers`, `cart`, `orders`

> **Estado: flujo cart→order verificado end-to-end (2026-06-13)** tras el
> `db push`. Una orden real se crea, reserva stock y se lista. Pendientes:
> el defecto de idempotencia (arriba), la UI admin y el test de carrera.

- [x] Clientes compradores: `POST /customers/register`, `/customers/guests`, CRUD de direcciones. Guest checkout + merge de carrito. _Verificado: register 201._
- [x] Carrito persistente server-side con validación de stock y precios. _Verificado: add line 201, reserva refleja stock._
- [x] Checkout como máquina de estados (`cart → address → shipping → payment → confirmation`). _Verificado: las 4 transiciones 201._
- [x] Órdenes: numeración (`order_sequences`, `WEB-000001`), snapshot en `order_lines`, campo `channel`. _Verificado._
- [~] Estados de orden/pago como máquinas de estado + historial — creados en `pending`/`pending`; **transiciones de estado no ejercitadas aún**.
- [x] Idempotencia (`Idempotency-Key` + `order_idempotency_keys`): header obligatorio, replay devuelve la orden original, conflicto por payload distinto = 409. _Verificado tras fix 2026-06-13._
- [~] Gestión de órdenes vía API (cambio de estado, notas, reenvío, cancelación) — endpoints existen, **sin verificar**.
- [~] Emails transaccionales: `order_email_templates` + cola `order_email_jobs` — encolado en creación, **entrega/reintentos sin verificar**.
- [ ] Admin (UI) de órdenes — el plan listaba "admin" y aquí solo hay API.
- [x] Test de carrera de inventario (e2e DB real): `apps/api/test/inventory-stock-race.e2e-spec.ts`. _Verificado 2026-06-14: con `stockedQuantity=1` y 5 `reserve()` concurrentes para la misma variante/ubicación, exactamente 1 gana (lock optimista por `version`); `release()` devuelve `reservedQuantity` a 0._

**Riesgo vigilado:** consistencia de stock bajo concurrencia. Reserva de inventario transaccional con locks optimistas (`inventory_levels.version`); **test de carrera de inventario (e2e DB real) — RESUELTO Y VERIFICADO 2026-06-14.**

### Fase 4 · Pagos, envíos e impuestos

_Equivalencia nopCommerce: Payment plugins, Shipping methods/providers, Tax providers, Refunds_

**Módulos:** `payments`, `shipping`, `taxes` — aquí nace el **sistema de providers (plugins)**

> **Andamiaje ya presente (aprovechar):** el módulo `reference-data`
> (countries / currencies / regions / **territories / zones**) da la base
> geográfica para zonas de envío e impuestos por región. El seed ya carga 7
> payment-providers y existe `GET /payment-providers`. La columna `cost` por
> variante (para márgenes/POS) ya existe en catálogo.

- [ ] Contrato `PaymentProvider` (authorize, capture, refund, void, webhook) con registro dinámico
- [ ] Adapters: Mercado Pago, Stripe, pago manual/transferencia, efectivo (para POS futuro)
- [ ] Webhooks de pago con verificación de firma, reintentos e idempotencia
- [ ] Reembolsos totales y parciales desde admin
- [ ] Contrato `ShippingProvider`: métodos por tienda, tarifas (fijo, por peso, por total), zonas de envío, pickup en tienda
- [ ] Tracking de envíos (número de guía, estado, notificación al cliente)
- [ ] Impuestos: categorías de impuesto por producto, IVA México (16%, tasa 0, exento), precios con/sin impuesto configurable por tienda
- [ ] Documentar "cómo escribir un provider" — primera prueba de fuego del proyecto como plataforma extensible

**Riesgo a vigilar:** los webhooks. Pagos duplicados o perdidos destruyen la confianza. Test e2e simulando reintentos de webhook.

### Fase 5 · Marketing y promociones

_Equivalencia nopCommerce: Discounts, Coupons, Gift Cards, Reward Points, Reviews, Campaigns_

**Módulos:** `promotions`, `reviews`, `giftcards`

- [ ] Motor de descuentos con reglas combinables: % o monto fijo, por producto/categoría/orden total, requisitos (mínimo de compra, primer pedido, rol de cliente)
- [ ] Cupones: códigos únicos o masivos, límites de uso (global y por cliente), vigencia
- [ ] Gift cards: emisión, saldo, redención parcial
- [ ] Reward points: acumulación por compra, redención como pago parcial (config por tienda)
- [ ] Reviews con moderación, rating agregado, compra verificada
- [ ] Newsletter: suscripciones + export (la mensajería masiva se delega a herramientas externas)

✅ **Cierre Hito 1:** ecommerce operable de punta a punta. Release `v1.0.0`, demo pública desplegada, seed con tienda de ejemplo completa.

---

## HITO 2 — Extensión POS

### Fase 6 · Inventario avanzado _(prerequisito duro del POS)_

- [ ] Sucursales/ubicaciones como entidad de primera clase (dirección, horario, tipo: almacén/tienda)
- [ ] Transferencias entre ubicaciones con estados (solicitada → en tránsito → recibida)
- [ ] Ajustes de stock con motivo y autorización; historial completo de movimientos (ledger inmutable de inventario)
- [ ] Conteos físicos (ciclos de conteo, diferencias, ajuste masivo)
- [ ] Alertas de stock bajo por ubicación

### Fase 7 · POS core (`apps/pos`)

- [ ] App de caja (Next.js PWA): UI optimizada para touch y teclado
- [ ] Búsqueda instantánea + escaneo de código de barras (cámara y lector USB/HID)
- [ ] Venta con canal `pos` contra el stock de la sucursal
- [ ] Cobro: efectivo (con cálculo de cambio), tarjeta (terminal externa registrada manualmente), pago mixto
- [ ] Ticket de venta: impresión térmica (ESC/POS) y envío por email/WhatsApp link
- [ ] Devoluciones y cambios sobre ticket existente
- [ ] Descuentos en línea (con permiso por rol de cajero)

### Fase 8 · Offline-first y sync _(la fase más difícil del proyecto)_

- [ ] Base local en dispositivo (IndexedDB/SQLite-wasm): catálogo, precios y stock de la sucursal replicados
- [ ] Cola de operaciones offline (ventas, ajustes) con orden garantizado
- [ ] Sync bidireccional por eventos con `Idempotency-Key`; reconciliación al reconectar
- [ ] Resolución de conflictos de stock definida y documentada (la venta física gana; el ecommerce ajusta)
- [ ] Modo degradado explícito en UI (banner offline, qué funciona y qué no)
- [ ] Suite de tests de sync: ventas simultáneas offline en 2 cajas del mismo producto

### Fase 9 · Operación de tienda física

- [ ] Sesiones de caja: apertura con fondo, cierre con arqueo (esperado vs contado, diferencias)
- [ ] Múltiples cajeros por sucursal, PIN rápido para cambio de operador
- [ ] Movimientos de efectivo (entradas/salidas con motivo)
- [ ] Reportes: ventas por caja/cajero/turno/sucursal, corte X y corte Z

✅ **Cierre Hito 2:** release `v2.0.0` — plataforma ecommerce + POS.

---

## HITO 3 — Paridad nopCommerce extendida (post v2)

Por prioridad sugerida:

1. **Facturación CFDI 4.0** (México) — provider de facturación (PAC), timbrado desde orden/ticket, complemento de pago. _El diferenciador #1 del proyecto; puede adelantarse tras la Fase 4 si hay demanda._
2. **Multi-idioma y multi-moneda** — entidades localizables (nombre/descripción/SEO por idioma), tipos de cambio con actualización programada
3. **RMA completo** — solicitudes de devolución del cliente, flujo de aprobación, reembolso/cambio/nota de crédito
4. **Multi-vendor / marketplace** — vendors con su propio catálogo y comisiones (nopCommerce lo tiene; decidir si entra al core o como módulo opcional)
5. **CMS ligero** — páginas (topics), bloques de contenido, menús. _Blog y foros: fuera del core, mejor integraciones_
6. **Tareas programadas** — scheduler (BullMQ): limpieza de carritos, tipos de cambio, emails diferidos, reindex
7. **Webhooks públicos** — suscripciones a eventos de dominio para integraciones de terceros
8. **GDPR/LFPDPPP** — export y borrado de datos personales, consentimientos
9. **Reportes y dashboard avanzados** — ventas, productos top, clientes top, impuestos, márgenes
10. **Afiliados** — tracking de referidos y comisiones (baja prioridad)

---

## Estrategia de calidad continua

| Práctica                                                      | Cuándo                                |
| ------------------------------------------------------------- | ------------------------------------- |
| Pirámide de tests (unit > e2e > ui)                           | Cada módulo, desde Fase 1             |
| Test de regresión de fronteras (ESLint boundaries)            | CI, cada PR                           |
| Test de carrera de inventario                                 | Fase 3 en adelante, cada release      |
| Suite de sync offline                                         | Fase 8 en adelante, cada release      |
| Migraciones probadas contra copia de datos demo               | Cada release                          |
| Audit de dependencias (`yarn npm audit`) + Renovate           | CI semanal                            |
| Performance budget del API (p95 < 300ms endpoints de lectura) | Desde Fase 2                          |
| Observabilidad: logs estructurados + métricas básicas         | Desde Fase 1; OpenTelemetry en Hito 2 |
| Demo pública actualizada por release                          | Desde cierre Hito 1                   |

## Orden de batalla

```
Fase 0 ✅ → Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → [v1.0.0]
→ Fase 6 → Fase 7 → Fase 8 → Fase 9 → [v2.0.0] → Hito 3 por demanda
```

Cada fase inicia con su **spec-dev** (asunciones → refinamiento → especificación) y la especificación se convierte en el prompt de implementación para Claude Code.
