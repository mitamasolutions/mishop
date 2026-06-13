# Plan de desarrollo — mitama-commerce

Objetivo: replicar la profundidad funcional de **nopCommerce** (ecommerce) y extenderla con **POS offline-first**, manteniendo estabilidad y robustez de nivel producción en cada fase.

Regla madre: **ninguna fase se cierra sin cumplir su Definition of Done.** Avanzar rápido con bases frágiles es lo que mata estos proyectos.

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

### Fase 1 · Fundación

_Equivalencia nopCommerce: Customers/Roles, ACL, Multi-store, Settings, Activity Log_

**Módulos:** `auth`, `stores`, `settings`, `activity-log`

- [ ] Auth: login email+contraseña, JWT access + refresh con rotación, bloqueo por intentos, recuperación de contraseña, invitación de usuarios
- [ ] ACL granular: permisos por recurso/acción, roles predefinidos + roles personalizados, guard `@RequirePermission()`
- [ ] Multi-tienda: CRUD de stores, usuario↔tienda con rol por tienda, scoping automático por `store_id` en todas las queries (middleware Prisma)
- [ ] Settings tipados en 2 niveles (global / por tienda) con cache e invalidación por evento
- [ ] Activity log: quién, qué, sobre qué entidad, cuándo, desde qué IP
- [ ] Admin: login, layout (sidebar, selector de tienda, dark mode), CRUD de usuarios/roles/tiendas/settings
- [ ] Seed: super admin + tienda demo

**Riesgo a vigilar:** el scoping multi-tienda. Si una query se escapa sin `store_id`, es fuga de datos entre tiendas. Test específico que lo verifique.

### Fase 2 · Catálogo

_Equivalencia nopCommerce: Products, Categories, Manufacturers, Attributes, Specifications, Tier Prices, Related Products, Tags, Inventory/Warehouses_

**Módulos:** `catalog`, `inventory`, `media`

- [ ] Productos: simples y con variantes (combinaciones de atributos), SKU/GTIN/código de barras por variante
- [ ] Atributos de producto (talla, color...) y atributos de especificación (filtrables)
- [ ] Categorías jerárquicas (árbol con drag & drop en admin) y fabricantes/marcas
- [ ] Precios: precio base, precio de oferta con vigencia, tier prices (precio por cantidad), costo (para márgenes y POS)
- [ ] Inventario **por ubicación** desde el inicio: stock, reservas, backorder configurable, umbral de stock bajo
- [ ] Media: subida de imágenes (S3-compatible/claudinary/local), orden, alt text, imagen por variante
- [ ] Productos relacionados y cross-sell; tags
- [ ] SEO por producto/categoría: slug único, meta title/description, redirects al cambiar slug
- [ ] Búsqueda y filtros en admin (nombre, SKU, categoría, estado, stock)
- [ ] Import/export CSV de productos (lo pedirá todo el mundo)

**Riesgo a vigilar:** el modelo de variantes. Estudiar schemas de Medusa/Saleor ANTES de escribir el .prisma. Es la decisión más cara de revertir de todo el proyecto.

### Fase 3 · Ventas

_Equivalencia nopCommerce: Customers (compradores), Shopping Cart, Checkout, Orders, Order Notes, Returns (base)_

**Módulos:** `customers`, `cart`, `orders`

- [ ] Clientes compradores: registro vía API, perfiles, múltiples direcciones, guest checkout
- [ ] Carrito persistente (server-side) con validación de stock y precios al momento
- [ ] Checkout como máquina de estados explícita: dirección → envío → pago → confirmación
- [ ] Órdenes: numeración configurable, snapshot inmutable de precios/productos al momento de compra, campo `channel` (web/pos)
- [ ] Estados de orden y de pago como máquinas de estado (no strings sueltos), historial de transiciones
- [ ] Idempotencia en creación de órdenes (`Idempotency-Key`)
- [ ] Admin: gestión de órdenes, cambio de estados, notas internas, reenvío de confirmación, cancelación con liberación de stock
- [ ] Emails transaccionales base: orden creada, pagada, cancelada (message templates editables, cola con reintentos)

**Riesgo a vigilar:** consistencia de stock bajo concurrencia. Reserva de inventario transaccional con locks optimistas; test de carrera obligatorio.

### Fase 4 · Pagos, envíos e impuestos

_Equivalencia nopCommerce: Payment plugins, Shipping methods/providers, Tax providers, Refunds_

**Módulos:** `payments`, `shipping`, `taxes` — aquí nace el **sistema de providers (plugins)**

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
