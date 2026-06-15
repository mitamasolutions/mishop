# Sprint 1 · r17 — Promociones (promotions) [congelado]

> Estado: 🧊 congelado · Origen: `fase-05-marketing-promociones` · Hito: F0 (alcance congelado)
> Módulo: `packages/modules/promotions`

## Resumen

Motor de descuentos con reglas combinables, cupones, reward points y captación de
newsletter, sin acoplar la lógica al carrito ni a las órdenes. **Construido a
nivel dominio + API pero NO integrado al checkout del MVP**: compila y mantiene
sus tests verdes, pero `cart`/`orders`/`payments` no lo invocan. Equivale a
Discounts + Coupons + Reward Points + Campaigns de nopCommerce. Las gift cards
viven en [[sprint1_r18_giftcards]] y las reviews en [[sprint1_r19_reviews]].

## Historia de usuario

> Como comerciante, quiero configurar descuentos, cupones, puntos de recompensa y
> newsletter, para incentivar compra y fidelizar clientes, manteniendo cada
> tienda aislada y consistente.

## Alcance

**Dentro (backend, congelado):**
- Motor de descuentos: % o monto fijo, alcance producto/categoría/orden,
  condiciones combinables, vigencia, combinabilidad controlada.
- Cupones: código único o generación masiva, límites global y por cliente,
  vigencia.
- Reward points: acumulación, redención como pago parcial, expiración, config por
  tienda. *(Nota: se planifica extraer a una fase `loyalty` aparte.)*
- Newsletter: suscripción doble opt-in, baja y export CSV.

**Fuera del MVP:**
- Integración al checkout (cart/orders/payments).
- Admin UI completa.
- Envío masivo de campañas (se delega a herramientas externas).
- Descuentos aplicados al costo de envío.
- Apilamiento libre sin marca de combinable.

## Requisitos funcionales

### Motor de descuentos
1. Descuentos de tipo **porcentaje (%)** o **monto fijo**, cada uno con **tope
   máximo** opcional.
2. **Alcance:** producto, categoría/colección o subtotal de la orden.
3. **Condiciones** combinables con AND: mínimo de compra (subtotal), primer
   pedido del cliente, rol/segmento de cliente.
4. Aplicación **automática** (sin código) o **requerir cupón**.
5. **Fecha inicio/fin** opcionales y **flag activo/inactivo**.
6. Cálculo sobre el **subtotal antes de impuestos y envío**.
7. Por defecto **no se apilan**: solo el de mayor beneficio, salvo los marcados
   **combinables**, que se suman.

### Cupones
8. **Código único** reutilizable o **generación masiva** de N códigos de un solo
   uso ligados al mismo descuento.
9. **Límite global** y **límite por cliente**.
10. **Un solo cupón por orden.**
11. Códigos **case-insensitive**, normalizados (trim + mayúsculas).

### Reward points *(planificado mover a fase `loyalty`)*
12. Acreditar **X puntos por unidad de moneda** gastada (tasa por tienda), sobre
    el monto tras descuentos.
13. Canje como **pago parcial** con tasa puntos→dinero configurable y tope % de la
    orden pagable con puntos.
14. Se acreditan al completar/pagar; se revierten en cancelación/reembolso.
15. **Expiran** según config por tienda (ej. 12 meses).

### Newsletter
16. **Doble opt-in** (confirmación por email) y **baja** (unsubscribe).
17. **Exportar** suscriptores en **CSV**, filtrable por tienda y estado.

### Multi-tienda e integración
18. Cada descuento, cupón, saldo de puntos y suscripción **pertenece a una tienda**
    (`storeId`) y nunca cruza entre tiendas.
19. La integración con carrito/órdenes se realiza **vía eventos/puertos**,
    respetando idempotencia (cuando se descongele).

## Reglas de negocio

- **Aislamiento por tienda:** ningún recurso de marketing cruza `storeId`.
- **No apilamiento por defecto:** entre no combinables gana el de mayor beneficio;
  los combinables se suman.
- **Base de cálculo:** descuentos sobre subtotal pre-impuestos y pre-envío.
- Un cupón por orden; códigos normalizados.
- Vigencia y estado: fuera de fechas/inactivo → rechazo al validar.
- **Puntos diferidos:** atados al ciclo pagado; reversión en cancelación/reembolso.
- **Idempotencia:** redenciones/acumulaciones bajo la misma `Idempotency-Key`
  devuelven el resultado original sin re-ejecutar.

## Asunciones

- Descuentos no apilan por defecto; solo combinables se suman.
- Dos tipos (% y monto fijo) con tope opcional; alcance producto/categoría/orden.
- Condiciones AND; automático o cupón; vigencia y flag.
- Cupones único reutilizable o masivo de un solo uso, con límites global/cliente;
  un cupón por orden; normalizados.
- Reward points por unidad de moneda tras descuentos; canje con tope y tasa;
  acreditados al pagar; reversibles; expiran por config.
- Newsletter doble opt-in + baja; export CSV.
- Backend + API; Admin UI fuera o mínima; integración vía eventos/puertos.

## Criterios de aceptación

- [ ] Crear descuento % y monto fijo con tope, y verlos aplicados respetando el
      tope.
- [ ] Alcance de categoría afecta solo a esa categoría; de orden al subtotal.
- [ ] Condición "primer pedido" rechaza a cliente con pedidos previos, acepta a
      uno nuevo.
- [ ] Dos no combinables → aplica el de mayor beneficio; dos combinables → suma.
- [ ] Descuento automático aplica sin código; con cupón solo con código válido.
- [ ] Descuento fuera de fechas o inactivo no aplica.
- [ ] Generar masivamente N cupones de un solo uso; cada uno se redime una vez.
- [ ] Cupón con límite global agotado se rechaza; por cliente solo a ese cliente.
- [ ] Dos cupones en una orden → rechazado el segundo.
- [ ] Código en minúsculas y con espacios se valida tras normalización.
- [ ] Completar compra acredita puntos según tasa, sobre monto tras descuentos.
- [ ] Redimir puntos respeta tope % y tasa de conversión.
- [ ] Cancelar/reembolsar revierte puntos; puntos expirados dejan de estar
      disponibles.
- [ ] Suscripción exige doble opt-in y permite baja; export produce CSV filtrado.
- [ ] Ningún recurso de marketing es visible/aplicable desde otra tienda.
- [ ] Redención repetida con misma `Idempotency-Key` devuelve el resultado
      original sin doble efecto.

## Estado

**Construido (congelado):** entidades `PromotionDiscount`, `PromotionCoupon`,
`NewsletterSubscription`, `RewardProgramConfig`, `RewardLedgerEntry`; casos de uso
de crear descuento/cupón, generación masiva, preview/redeem de cupón, evaluación
de promociones. Adapters Prisma + in-memory; tests verdes.

**Decisión de alcance (F0):** no se integra al checkout del MVP. El código
**reward** (`Accrue/Reverse/ConfigureRewardProgram`) se deja **intacto y sin
cablear a eventos**, marcado como "pendiente de extraer a fase `loyalty`".

**Pendiente (Sprint futuro):** integración al checkout (cart/orders), canje de
puntos + expiración + wiring de eventos, Admin UI, e2e con DB real y seed demo.
Limpieza menor pendiente: `evaluatePromotions` debe usar
`findApplicableDiscounts(storeId, now)` en el puerto (empujar filtro al WHERE);
`SubscribeNewsletterUseCase` separar rama nuevo-vs-existente — ver
[[sprint1_r18.1_giftcard_release]] y [[sprint1_r19.1_reviews_verified_purchase]]
para el resto de las correcciones de marketing.
