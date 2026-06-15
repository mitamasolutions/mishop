# ROADMAP — mitama-commerce

> Fuente de verdad **única y viva** de la planeación del proyecto. Consolida toda
> la planeación que antes vivía dispersa en `docs/PLAN.md`,
> `docs/PLAN_REFORCE_100.md` y `docs/PENDIENTES.md` — esos tres documentos fueron
> **migrados aquí y eliminados**. Este ROADMAP refleja el **estado actual real** y,
> cuando hay divergencia con la planeación histórica, gana el estado entregado.
>
> Última actualización: 2026-06-14.

## Objetivo del proyecto

Replicar la profundidad funcional de **nopCommerce** (ecommerce) y extenderla con
**POS offline-first**, manteniendo estabilidad y robustez de nivel producción en
cada entrega. Plataforma open source (MIT) de ecommerce + POS para LATAM.

> **Regla madre:** ningún sprint/hito se cierra sin cumplir su Definition of Done.
> Avanzar rápido con bases frágiles es lo que mata estos proyectos.

## Cómo se organiza

- El trabajo se planea en **sprints**. Todo el cuerpo de trabajo planeado hasta
  hoy (lo que en los documentos viejos eran "Fases 1–5 de features" y
  "Fases 0–9 de endurecimiento") forma el **Sprint 1 — MVP ecommerce
  (API + Admin)**.
- Cada requisito del Sprint 1 tiene una **spec** en `docs/specs/` con
  nomenclatura `sprint1_rN_<modulo>.md` (granular por módulo). Las
  continuaciones de un requisito usan `rN.1` (p. ej. `sprint1_r13.1_…`).
- Los **hitos** del Sprint 1 son las 10 fases transversales del plan de
  endurecimiento (Fase 0 alcance … Fase 9 CI/CD); cada spec aporta a uno o más
  hitos.
- Leyenda de estado: ✅ entregado · 🟡 parcial · ⬜ pendiente · 🧊 congelado
  (construido pero fuera del checkout MVP).
- Secuencia de sprints: **Sprint 1** (MVP API+Admin, en curso) → **Sprint 2**
  (storefront público) → **Sprint 3** (extensión POS) → **Sprint 4** (paridad
  nopCommerce extendida). La **Fase L · Loyalty** está diferida y se programa
  cuando convenga, sin bloquear ningún sprint.

---

## Principios de estabilidad y Definition of Done

Aplican a **todos** los sprints. Ningún sprint/hito se cierra sin cumplir su DoD.

**Definition of Done (por módulo/entrega):**

- [ ] Tests unitarios de todos los casos de uso (repos in-memory, sin DB).
- [ ] Tests e2e de los endpoints del módulo (DB real vía Docker en CI).
- [ ] Migraciones Prisma **aditivas y reversibles** (nunca borrar columnas en la
      misma release que deja de usarlas).
- [ ] Validación de entrada en el borde HTTP (DTOs con class-validator/zod).
- [ ] Errores como `Result<T,E>`; ninguna excepción de dominio sin tipar.
- [ ] Swagger actualizado y seed demo cubriendo el módulo.
- [ ] Log de actividad para toda mutación admin.
- [ ] Documentación del módulo (README propio en su paquete).
- [ ] CI verde: lint + build + test + regla de fronteras entre módulos.

**Prácticas transversales desde el día 1:**

- Logs estructurados (pino) con correlation-id por request.
- Health checks (`/health`, `/health/db`) y graceful shutdown.
- Rate limiting y helmet en el API.
- Versionado del API (`/v1`): los contratos públicos no se rompen, se versionan.
- Releases con changesets + semver; CHANGELOG generado.
- Backups: documentar estrategia (Neon PITR / `pg_dump` en Docker).
- Toda escritura crítica acepta `Idempotency-Key`.

> **Brechas transversales del DoD aún pendientes** (no bloqueantes del MVP, pero
> sí del cierre de calidad): logs estructurados + correlation-id (ver
> [r24](specs/sprint1_r24_outbox_worker_observability.md)), READMEs por módulo, y
> seed demo que cargue productos e inventario.

---

## 1. Estado del proyecto (snapshot 2026-06-14)

Modular monolith hexagonal en TypeScript (NestJS + Prisma + Next.js admin).
16 módulos de negocio registrados en `apps/api/src/app.module.ts`.

| Módulo | Estado | Notas |
|---|---|---|
| `auth` | ✅ Completo | JWT, refresh rotation, RBAC, invitaciones, reset. Adapters Prisma. |
| `reference-data` | ✅ Completo | Countries, currencies, regions, territories, zones, payment-providers. |
| `stores` | ✅ Completo | CRUD multi-tienda, soft delete. |
| `settings` | ✅ Completo | Settings tipados global/tienda. |
| `activity-log` | 🟡 Parcial | Registro de mutaciones operativo; faltan filtros/export en admin. |
| `catalog` | ✅ Completo | Productos, variantes, taxonomías, precios, SEO. |
| `inventory` | ✅ Completo | Stock por ubicación, reservas claim-then-apply. |
| `media` | 🟡 Parcial | `ProductImage` persistido; backend configurable por afinar. |
| `customers` | 🟡 Parcial | CRUD + guest checkout; falta pantalla admin y segmentación. |
| `cart` | 🟡 Parcial | Server-side + validación primer corte; recalculo total server-side pendiente. |
| `orders` | 🟡 Parcial | Núcleo completo (idempotencia, outbox `order.created`, estados); recalculo total server-side pendiente. |
| `payments` | 🟡 Parcial | Manual + validación contra orden + webhooks idempotentes; Mercado Pago real pendiente. |
| `shipping` | 🟡 Parcial | Métodos/zonas; tracking y UI admin pendientes. |
| `taxes` | 🟡 Parcial | Reglas por región; cálculo completo en checkout pendiente. |
| `promotions` | 🧊 Congelado | Descuentos/cupones/newsletter/rewards; fuera del checkout MVP. |
| `giftcards` | 🧊 Congelado | Gift cards; release en cancel/refund entregado. |
| `reviews` | 🧊 Congelado | Reviews moderadas; proyección compra verificada entregada. |

---

## 2. Sprint 1 — MVP ecommerce (API + Admin)

### Objetivo

Llevar la plataforma de su estado alpha/staging avanzado a un **MVP ecommerce
vendible** sobre API + Admin, sin tienda pública ni POS, con instalación
single-store por defecto y deploy reproducible en VPS/Docker.

### Definición de "MVP vendible" (criterio de salida)

- Un **super admin** puede: configurar la tienda default, métodos de pago
  (manual + Mercado Pago) y de envío; cargar productos con variantes, precios y
  stock por ubicación.
- Un **comprador** (vía API) puede: crear carrito guest, agregar líneas, avanzar
  checkout, pagar con manual o Mercado Pago y recibir orden confirmada con email
  transaccional.
- Un **operador** (vía admin) puede: ver órdenes, clientes, pagos y envíos;
  cambiar estados, cancelar, registrar pago manual, generar tracking.
- **Operación:** la DB se levanta con migraciones (no `db push`); CI corre lint
  + build + tests + e2e con DB real; un VPS limpio se despliega con
  `docker compose` y un script.

### Veredicto actual: 🟡 NO listo para cerrar — seguir refinando Sprint 1

El núcleo está entregado, pero quedan brechas bloqueantes para el criterio de
salida. **No se pasa al Sprint 2 hasta cerrarlas.**

### Hitos del Sprint 1 (fases de endurecimiento)

| Hito | Estado | Cubierto | Pendiente |
|---|---|---|---|
| **F0 · Congelar alcance** | ✅ | `promotions`/`giftcards`/`reviews` fuera del checkout; endpoints MVP documentados | — |
| **F1 · Seguridad/RBAC/single-store** | ✅ | `PermissionsGuard` fail-closed, `@RequirePermission` consistente, store desde contexto | — |
| **F2 · Baseline DB** | ✅ | Baseline limpio, FKs críticas, CHECK constraints, índices parciales (settings/roles + `handle`/`sku` activos), `storeId` en unicidad de webhooks (transitorio nullable → F3 lo hará NOT NULL), `TaxRule.rate >= 0` | — |
| **F3 · Checkout server-side** | ✅ | Guest customer, validación carrito (expirado/deleted/precio), **recálculo server-side de subtotal/envío/impuestos** vía `CheckoutTaxResolverPort` y `CheckoutShippingResolverPort` (envío no se grava), snapshot inmutable con `taxAmount` por línea y método resuelto server-side, rechazo si la zona deja de cubrir | Validar canal del producto vs carrito (pendiente menor; el storeId ya se valida) |
| **F4 · Inventario correcto** | ✅ | claim-then-apply en release/consume, reserva→consumo por `payment.paid`, `releaseExpired` | Métricas/logs de reservas (no bloqueante) |
| **F5 · Pagos manual + Mercado Pago** | ✅ | Plugin Strategy (descriptor + validateConfig + estado configured/misconfigured), `CredentialCipher` AES-256-GCM con `PAYMENTS_ENCRYPTION_KEY` fail-closed, credenciales cifradas por tienda, manual paid, MP Checkout Pro real (HttpMercadoPagoClient + verificación HMAC antes de parsear), webhooks idempotentes por (storeId, providerCode, eventId) — webhook URL tenant-scoped (`/payments/webhooks/:storeId/:providerCode`), `ResolveAvailablePaymentMethods` filtra mal configurados y los reporta para alerta en admin | UI de configuración en F5 (sprint1_cierre) |
| **F6 · Admin operativo** | ✅ | Pantalla **Órdenes** paginada (server-side, page=20) con búsqueda debounce; pantallas **Clientes** (lista + detalle con direcciones e historial), **Pagos** y **Envíos** como secciones del detalle de orden, **Configuración de métodos de pago** por tienda (descriptor + alerta misconfigured), **Tareas programadas** (Super Admin). Dashboard con 4 KPIs reales (órdenes hoy, pendientes pago, alertas stock, ingresos día). Hook `useDebounce` reutilizable. Acciones ocultas/deshabilitadas por permiso via `hasPermission`. Sidebar con entradas filtradas | — |
| **F7 · Hardening API + Admin** | ✅ | API: CORS whitelist, Helmet/CSP, ValidationPipe, rate limits, env validation. Admin: refresh token en cookie HttpOnly/Secure/SameSite=Lax, `NEXT_PUBLIC_API_URL` obligatoria (build prod falla sin ella), CSP + headers de seguridad en `next.config.ts`, `skipStoreScope` solo definido en api-client (no abusado en llamadas) | — |
| **F8 · Outbox/worker/observabilidad** | ✅ | Outbox `order.created` transaccional + dispatcher manual. **F4 sprint1_cierre**: scheduler in-app estilo nopCommerce (`ScheduledTask` + runner @nestjs/schedule, lock por fila, admin Super Admin), tareas por defecto `dispatch-outbox`/`drain-email-queue`/`release-expired-reservations`, `DrainEmailQueueUseCase` con backoff + `EmailSender` port + Log adapter, outbox para `payment.*` y `order.cancelled/completed/refunded`, `requestId` propagado vía `RequestContextService` y `X-Request-Id` header. Worker dedicado ELIMINADO del alcance | Logger estructurado (pino) y `/health/worker` quedan opcionales |
| **F9 · CI/CD y Deploy** | 🟡 | Dockerfiles api/admin, `docker-compose.prod.yml`, `DEPLOY.md` | CI (`.github/workflows/ci.yml`), `scripts/deploy.sh`, `apps/worker/Dockerfile`, imágenes GHCR |

### Brechas bloqueantes (resumen priorizado)

1. ~~**F7 admin** (cookies HttpOnly + CSP)~~ → `sprint1_r22` cerrado (sprint1_cierre · F1).
2. ~~F5 segundo corte (Mercado Pago real)~~ → `sprint1_r14` cerrado (sprint1_cierre · F3).
3. ~~F6 segundo corte (Clientes/Pagos/Envíos)~~ → `sprint1_r23` cerrado (sprint1_cierre · F5).
4. ~~F8 segundo corte (worker + observabilidad)~~ → `sprint1_r24` cerrado (sprint1_cierre · F4, scheduler in-app).
5. **F9 segundo corte** (CI + deploy.sh) — calidad de cambios → `sprint1_r25`.
6. ~~F3 (recálculo total server-side)~~ → `sprint1_r13` cerrado (sprint1_cierre · F2). ~~F2 / r20~~ cerrado (sprint1_cierre · F0).

### Trazabilidad requisito ↔ spec

| Spec | Estado | Hito(s) | Tema |
|---|---|---|---|
| [sprint1_r1_auth](specs/sprint1_r1_auth.md) | ✅ | F1 | Autenticación, JWT, lockout, reset/invitaciones |
| [sprint1_r2_users_roles](specs/sprint1_r2_users_roles.md) | ✅ | F1 | Usuarios, roles, ACL, RBAC fail-closed |
| [sprint1_r3_stores](specs/sprint1_r3_stores.md) | ✅ | F1 | Multi-tienda, single-store resolution |
| [sprint1_r4_settings](specs/sprint1_r4_settings.md) | ✅ | F1 | Settings tipados global/tienda |
| [sprint1_r5_activity_log](specs/sprint1_r5_activity_log.md) | 🟡 | F1 | Activity log inmutable |
| [sprint1_r6_reference_data](specs/sprint1_r6_reference_data.md) | ✅ | F1 | Countries, currencies, payment-providers |
| [sprint1_r7_regions_territories_zones](specs/sprint1_r7_regions_territories_zones.md) | ✅ | F1 | Geografía + config de envío |
| [sprint1_r8_catalog](specs/sprint1_r8_catalog.md) | ✅ | — | Productos, variantes, precios, SEO |
| [sprint1_r9_inventory](specs/sprint1_r9_inventory.md) | ✅ | F4 | Stock por ubicación, reservas |
| [sprint1_r10_media](specs/sprint1_r10_media.md) | 🟡 | — | Imágenes por producto/variante |
| [sprint1_r11_customers](specs/sprint1_r11_customers.md) | 🟡 | F3, F6 | Clientes, direcciones, guest |
| [sprint1_r12_cart](specs/sprint1_r12_cart.md) | 🟡 | F3 | Carrito server-side, checkout |
| [sprint1_r13_orders](specs/sprint1_r13_orders.md) | ✅ | F3, F8 | Órdenes, snapshot, estados, outbox |
| [sprint1_r13.1_order_idempotency](specs/sprint1_r13.1_order_idempotency.md) | ✅ | F3 | Idempotencia robusta en CreateOrder |
| [sprint1_r14_payments](specs/sprint1_r14_payments.md) | ✅ | F5 | Providers, webhooks, refunds, MP real |
| [sprint1_r15_shipping](specs/sprint1_r15_shipping.md) | 🟡 | F5, F6 | Métodos, zonas, pickup, tracking |
| [sprint1_r16_taxes](specs/sprint1_r16_taxes.md) | 🟡 | F5 | Categorías de impuesto, IVA México |
| [sprint1_r17_promotions](specs/sprint1_r17_promotions.md) | 🧊 | F0 | Descuentos, cupones, newsletter, rewards |
| [sprint1_r18_giftcards](specs/sprint1_r18_giftcards.md) | 🧊 | F0 | Gift cards como medio de pago |
| [sprint1_r18.1_giftcard_release](specs/sprint1_r18.1_giftcard_release.md) | ✅ | F0 | Release en cancel/refund |
| [sprint1_r19_reviews](specs/sprint1_r19_reviews.md) | 🧊 | F0 | Reviews moderadas, compra verificada |
| [sprint1_r19.1_reviews_verified_purchase](specs/sprint1_r19.1_reviews_verified_purchase.md) | ✅ | F0 | Proyección por eventos (boundary fix) |
| [sprint1_r20_db_baseline_constraints](specs/sprint1_r20_db_baseline_constraints.md) | ✅ | F2 | Baseline, FKs, CHECK, índices parciales |
| [sprint1_r21_api_hardening](specs/sprint1_r21_api_hardening.md) | ✅ | F7 | CORS, Helmet/CSP, ValidationPipe, rate limits |
| [sprint1_r22_admin_hardening](specs/sprint1_r22_admin_hardening.md) | ✅ | F7 | Cookies HttpOnly, CSP next.config |
| [sprint1_r23_admin_operativo](specs/sprint1_r23_admin_operativo.md) | ✅ | F6 | Pantallas admin: Órdenes/Clientes/Pagos/Envíos/Tareas/Métodos pago + dashboard real |
| [sprint1_r24_outbox_worker_observability](specs/sprint1_r24_outbox_worker_observability.md) | ✅ | F8 | Outbox extendido, scheduler in-app (no worker dedicado), requestId |
| [sprint1_r25_cicd_deploy](specs/sprint1_r25_cicd_deploy.md) | 🟡 | F9 | Docker (hecho), CI + deploy.sh + GHCR |

---

## 3. Sprint 2 — Storefront (tienda pública)

Se abre **solo** cuando el Sprint 1 cumpla su criterio de salida. Construye
`apps/web`: la tienda pública que consume el catálogo y el checkout del MVP ya
existentes (API + Admin). Cierra el ciclo comprador end-to-end con UI.

**Alcance propuesto (por detallar con spec-dev al planear):**

- **Storefront (`apps/web`)** que consume el catálogo (productos, variantes,
  precios, taxonomías, SEO) y el flujo de carrito/checkout del MVP.
- Páginas: home, listado/categoría con filtros, detalle de producto, carrito,
  checkout guiado (dirección → envío → pago → confirmación), confirmación de
  orden.
- Guest checkout por email (sin login de comprador, alineado con el MVP).
- Integración con pagos reales (manual + Mercado Pago) y reglas de envío/impuesto
  ya server-side.
- SEO real (slugs, redirects 301, meta) explotando lo de
  [r8](specs/sprint1_r8_catalog.md).
- **Marketing integrado al checkout** (opcional en este sprint): descongelar
  `promotions`/`giftcards`/`reviews` y cablearlos a `cart`/`orders` (cupones,
  gift cards como medio de pago, reviews con compra verificada), con su UI admin,
  e2e y seed demo. Ver [r17](specs/sprint1_r17_promotions.md),
  [r18](specs/sprint1_r18_giftcards.md), [r19](specs/sprint1_r19_reviews.md).

*(Hitos y specs `sprint2_rN_*` a crear al planear el Sprint 2.)*

---

## 4. Sprint 3 — Extensión POS (ex Hito 2)

Plataforma ecommerce + **POS offline-first** para venta presencial. Aprovecha
`channel=pos`, idempotencia e inventario por ubicación ya preparados en el MVP.
Cierre objetivo: release **v2.0.0**.

### Hito 3.1 · Inventario avanzado *(prerequisito duro del POS)*

- [ ] Sucursales/ubicaciones como entidad de primera clase (dirección, horario,
      tipo: almacén/tienda).
- [ ] Transferencias entre ubicaciones con estados (solicitada → en tránsito →
      recibida).
- [ ] Ajustes de stock con motivo y autorización; historial completo de
      movimientos (ledger inmutable de inventario).
- [ ] Conteos físicos (ciclos de conteo, diferencias, ajuste masivo).
- [ ] Alertas de stock bajo por ubicación.

### Hito 3.2 · POS core (`apps/pos`)

- [ ] App de caja (Next.js PWA): UI optimizada para touch y teclado.
- [ ] Búsqueda instantánea + escaneo de código de barras (cámara y lector
      USB/HID).
- [ ] Venta con canal `pos` contra el stock de la sucursal.
- [ ] Cobro: efectivo (con cálculo de cambio), tarjeta (terminal externa
      registrada manualmente), pago mixto.
- [ ] Ticket de venta: impresión térmica (ESC/POS) y envío por email/WhatsApp
      link.
- [ ] Devoluciones y cambios sobre ticket existente.
- [ ] Descuentos en línea (con permiso por rol de cajero).

### Hito 3.3 · Offline-first y sync *(la fase más difícil del proyecto)*

- [ ] Base local en dispositivo (IndexedDB/SQLite-wasm): catálogo, precios y
      stock de la sucursal replicados.
- [ ] Cola de operaciones offline (ventas, ajustes) con orden garantizado.
- [ ] Sync bidireccional por eventos con `Idempotency-Key`; reconciliación al
      reconectar.
- [ ] Resolución de conflictos de stock definida y documentada (la venta física
      gana; el ecommerce ajusta).
- [ ] Modo degradado explícito en UI (banner offline, qué funciona y qué no).
- [ ] Suite de tests de sync: ventas simultáneas offline en 2 cajas del mismo
      producto.

### Hito 3.4 · Operación de tienda física

- [ ] Sesiones de caja: apertura con fondo, cierre con arqueo (esperado vs
      contado, diferencias).
- [ ] Múltiples cajeros por sucursal, PIN rápido para cambio de operador.
- [ ] Movimientos de efectivo (entradas/salidas con motivo).
- [ ] Reportes: ventas por caja/cajero/turno/sucursal, corte X y corte Z.

---

## 5. Sprint 4 — Paridad nopCommerce extendida (ex Hito 3, post v2)

Por prioridad sugerida:

1. **Facturación CFDI 4.0** (México) — provider de facturación (PAC), timbrado
   desde orden/ticket, complemento de pago. *El diferenciador #1 del proyecto;
   puede adelantarse tras el Sprint 1 si hay demanda.*
2. **Multi-idioma y multi-moneda** — entidades localizables
   (nombre/descripción/SEO por idioma), tipos de cambio con actualización
   programada.
3. **RMA completo** — solicitudes de devolución del cliente, flujo de aprobación,
   reembolso/cambio/nota de crédito.
4. **Multi-vendor / marketplace** — vendors con su propio catálogo y comisiones
   (decidir si entra al core o como módulo opcional).
5. **CMS ligero** — páginas (topics), bloques de contenido, menús. *Blog y foros
   fuera del core, mejor integraciones.*
6. **Tareas programadas** — scheduler (BullMQ): limpieza de carritos, tipos de
   cambio, emails diferidos, reindex.
7. **Webhooks públicos** — suscripciones a eventos de dominio para integraciones
   de terceros.
8. **GDPR/LFPDPPP** — export y borrado de datos personales, consentimientos.
9. **Reportes y dashboard avanzados** — ventas, productos top, clientes top,
   impuestos, márgenes.
10. **Afiliados** — tracking de referidos y comisiones (baja prioridad).

---

## 6. Fase L · Loyalty — Reward Points *(diferida, fuera de v1.0.0)*

Separada de marketing por decisión de producto: la lealtad es un subsistema propio
(acumulación, expiración, canje como pago) que merece su propio módulo y ciclo.
Se programa cuando convenga, **sin bloquear** ningún sprint.

> **Punto de partida disponible:** existen como **código semilla** dentro de
> `promotions` los casos de uso `ConfigureRewardProgram`, `AccrueRewardPoints` y
> `ReverseRewardPoints` (con su tabla `RewardLedgerEntry` y config por tienda), ya
> corregidos contra doble acumulación. **No están cableados a eventos ni expuestos
> como feature.** Al abrir esta fase, extraerlos a un módulo `loyalty` propio.

- [ ] Extraer reward points de `promotions` a un módulo `loyalty` dedicado.
- [ ] **Acumulación** por compra al pagar la orden (`order.completed`), con tasa
      configurable por tienda.
- [ ] **Reversa** de puntos en cancelación/reembolso leyendo la acumulación
      original del `orderId` (no confiar en un monto recibido).
- [ ] **Canje** de puntos como pago parcial (tasa puntos→dinero + tope de % de la
      orden, configurables) — **falta por completo**.
- [ ] **Expiración** de puntos: consultar saldo disponible excluyendo entradas
      vencidas (`expiresAt`) — hoy se escribe pero no se lee.
- [ ] Redondeo correcto de la acumulación (evitar `Math.floor` sobre float).
- [ ] Admin (UI), e2e y seed demo.

---

## 7. Backlog / no asignado a sprint

Derivado de las "Simplificaciones aceptadas" del MVP; se asignan a un sprint
cuando haya demanda:

- **Multi-tenant SaaS** — hoy single-store con `storeId` preservado.
- **Cuentas de comprador con login** — hoy guest checkout por email.
- **Stripe** como pasarela adicional (hoy solo Mercado Pago real).
- **Integración real con carriers** (FedEx, DHL, Estafeta) — hoy tracking manual.

*(CFDI, multi-idioma/moneda, RMA, marketplace, CMS, GDPR, reportes y afiliados
están priorizados en el Sprint 4; loyalty en la Fase L.)*

---

## 8. Decisiones de alcance vigentes (Sprint 1)

| Dimensión | Decisión |
|---|---|
| Release objetivo | MVP ecommerce **API + Admin** |
| Tienda pública (`apps/web`) | Fuera del MVP → **Sprint 2** |
| POS (`apps/pos`) | Fuera del MVP → **Sprint 3** |
| Modelo tenant | **Single-store por instalación**, `storeId` preservado |
| Pagos | **Manual + Mercado Pago real** |
| DB | **Baseline limpio** con reset de dev |
| Comprador | **Guest checkout + cliente opcional por email**, sin login |
| Deploy | **VPS / Docker Compose** |
| Promotions / GiftCards / Reviews / Rewards | **Congelados** fuera del flujo crítico |

---

## 9. Estrategia de calidad continua

| Práctica | Cuándo |
|---|---|
| Pirámide de tests (unit > e2e > ui) | Cada módulo, desde Sprint 1 |
| Test de regresión de fronteras (ESLint boundaries) | CI, cada PR |
| Test de carrera de inventario | Ventas en adelante, cada release |
| Suite de sync offline | Sprint 3 en adelante, cada release |
| Migraciones probadas contra copia de datos demo | Cada release |
| Audit de dependencias (`yarn npm audit`) + Renovate | CI semanal |
| Performance budget del API (p95 < 300 ms en lectura) | Desde catálogo |
| Observabilidad: logs estructurados + métricas básicas | Desde Sprint 1; OpenTelemetry en Sprint 3 |
| Demo pública actualizada por release | Desde cierre del Sprint 1 |

---

## 10. Riesgos a vigilar

- **Baseline destructivo:** regenerar migraciones rompe DBs locales con datos
  (aceptado por decisión).
- **Mercado Pago:** requiere credenciales reales, sandbox y webhook público
  accesible (ngrok/cloudflared en dev; dominio + TLS en prod).
- **Cookies admin:** si API y Admin viven en dominios distintos, cuidar
  `SameSite`, dominio de cookie y CORS con `credentials`.
- **Constraints SQL manuales:** índices parciales y checks no declarables en
  Prisma viven en migraciones SQL; no perderlos al regenerar.
- **Worker:** un proceso adicional cambia el modelo de deploy; documentar y
  monitorear.
- **Modelo de variantes (catálogo):** la decisión más cara de revertir; alineada
  a Medusa/Saleor. Cualquier cambio estructural se evalúa con cuidado.
- **Sync offline (Sprint 3):** la fase más difícil; resolución de conflictos de
  stock debe quedar definida y documentada antes de implementar.
