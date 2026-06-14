# Fase 5 · Marketing y promociones

## Resumen
Dota a mitama-commerce de las palancas de marketing que cierran el Hito 1: un
motor de descuentos con reglas combinables, cupones, gift cards, reward points,
reviews moderadas y captación de newsletter. Cubre a comerciantes que quieren
incentivar compra, fidelizar clientes y construir prueba social, sin acoplar la
lógica de promociones al carrito ni a las órdenes. Equivalencia nopCommerce:
Discounts, Coupons, Gift Cards, Reward Points, Reviews, Campaigns.

## Historia de usuario
> Como comerciante de una tienda mitama, quiero configurar descuentos, cupones,
> gift cards, puntos de recompensa y reviews moderadas, para incentivar la
> compra, fidelizar a mis clientes y mostrar prueba social, manteniendo cada
> tienda y canal aislado y consistente.

## Alcance
**Dentro:**
- Dominio + API (backend) de los módulos `promotions`, `reviews` y `giftcards`.
- Motor de descuentos: % o monto fijo, alcance producto/categoría/orden,
  condiciones combinables, vigencia, combinabilidad controlada.
- Cupones: código único o generación masiva, límites de uso global y por
  cliente, vigencia.
- Gift cards: emisión, saldo, redención parcial, estados y expiración.
- Reward points: acumulación, redención como pago parcial, expiración, config
  por tienda.
- Reviews: compra verificada, moderación, rating agregado.
- Newsletter: suscripción con doble opt-in, baja y export CSV.
- Integración con carrito/órdenes existentes vía eventos/puertos, respetando
  idempotencia.

**Fuera:**
- Admin UI (queda fuera o como capa mínima de esta fase).
- Envío masivo de campañas / emails de marketing (se delega a herramientas
  externas).
- Descuentos aplicados al costo de envío.
- Apilamiento libre de múltiples cupones o múltiples descuentos sin marca de
  combinable.

## Requisitos funcionales

### Motor de descuentos
1. El sistema permite crear descuentos de tipo **porcentaje (%)** o **monto
   fijo**, cada uno con un **tope máximo de descuento** opcional.
2. Cada descuento define un **alcance**: producto, categoría/colección o
   subtotal de la orden.
3. Cada descuento admite **condiciones** combinables con lógica AND: mínimo de
   compra (subtotal), primer pedido del cliente y rol/segmento de cliente.
4. Un descuento puede aplicarse de forma **automática** (sin código) o
   **requerir un cupón**.
5. Cada descuento tiene **fecha de inicio/fin** opcionales y un **flag
   activo/inactivo**.
6. El sistema calcula los descuentos sobre el **subtotal antes de impuestos y
   envío**.
7. Por defecto los descuentos **no se apilan**: se aplica únicamente el de mayor
   beneficio para el cliente, salvo los marcados explícitamente como
   **combinables**, que sí pueden sumarse entre sí.

### Cupones
8. El sistema permite crear un **código único** reutilizable o **generar de
   forma masiva** N códigos de un solo uso ligados al mismo descuento.
9. Cada cupón admite un **límite de uso global** (máximo total de redenciones) y
   un **límite por cliente**.
10. El sistema acepta **un solo cupón por orden**.
11. Los códigos se tratan **case-insensitive** y se normalizan (trim +
    mayúsculas) al crearlos y al validarlos.

### Gift cards
12. El sistema permite **emitir** gift cards (por admin y/o como producto
    comprado) con saldo inicial y **código único**.
13. Una gift card actúa como **método de pago**: reduce el total a pagar de la
    orden, no el subtotal.
14. El sistema soporta **redención parcial**: el saldo restante queda disponible
    para compras futuras.
15. Cada gift card tiene **expiración opcional** y un **estado**: activa,
    agotada, expirada o deshabilitada.
16. La **moneda** de la gift card debe coincidir con la moneda de la orden para
    poder redimirse.

### Reward points
17. El sistema acredita **X puntos por unidad de moneda** gastada, con tasa
    configurable por tienda, calculados sobre el monto pagado tras descuentos.
18. Los puntos se canjean como **pago parcial** con una tasa de conversión
    puntos→dinero configurable por tienda, con **tope opcional** de % de la
    orden pagable con puntos.
19. Los puntos se **acreditan al completar/pagar** la orden y se **revierten**
    si la orden se cancela o reembolsa.
20. Los puntos **expiran** según configuración por tienda (ej. 12 meses desde
    que se ganan).

### Reviews
21. Solo clientes con **compra verificada** del producto pueden crear una
    review.
22. Toda review entra en estado **pendiente** y requiere **aprobación de un
    moderador** antes de publicarse.
23. El rating usa una escala de **1 a 5 estrellas**; el **rating agregado** del
    producto promedia únicamente las reviews aprobadas.
24. Cada cliente puede dejar **una sola review por producto** comprado,
    editable mientras esté pendiente.

### Newsletter
25. El sistema gestiona **suscripciones con doble opt-in** (confirmación por
    email) y permite la **baja** (unsubscribe).
26. El sistema permite **exportar** la lista de suscriptores en **CSV**,
    filtrable por tienda y estado.

### Multi-tienda e integración
27. Cada descuento, cupón, gift card, saldo de puntos, review y suscripción
    **pertenece a una tienda** (`storeId`) y nunca cruza entre tiendas.
28. La integración con carrito/órdenes existentes se realiza **vía
    eventos/puertos**, respetando el contrato de **idempotencia** (header
    `Idempotency-Key`).

## Reglas de negocio
- **Aislamiento por tienda:** ningún recurso de marketing es visible ni aplicable
  fuera de su `storeId`.
- **No apilamiento por defecto:** ante varios descuentos aplicables no
  combinables, gana el de mayor beneficio para el cliente; los combinables se
  suman entre sí.
- **Base de cálculo:** descuentos sobre subtotal pre-impuestos y pre-envío; gift
  cards y puntos sobre el total a pagar.
- **Un cupón por orden.**
- **Códigos normalizados:** cupones y gift cards se comparan en mayúsculas y sin
  espacios.
- **Vigencia y estado:** un descuento/cupón/gift card fuera de fechas, inactivo
  o en estado no redimible se rechaza al validar.
- **Verificación de compra:** sin una orden completada que incluya el producto,
  no se admite review.
- **Moderación previa:** ninguna review afecta el rating agregado hasta ser
  aprobada.
- **Puntos diferidos:** acumulación y disponibilidad de puntos atadas al ciclo
  de vida pagado de la orden; reversión en cancelación/reembolso.
- **Coincidencia de moneda:** gift card y orden deben compartir moneda.
- **Idempotencia:** redenciones y acumulaciones bajo la misma `Idempotency-Key`
  devuelven el resultado original sin re-ejecutar.

## Criterios de aceptación
- [ ] Crear un descuento % y uno de monto fijo, ambos con tope máximo, y verlos
      aplicados respetando el tope.
- [ ] Un descuento con alcance de categoría solo afecta a los ítems de esa
      categoría; uno de orden afecta al subtotal.
- [ ] Un descuento con condición "primer pedido" se rechaza para un cliente con
      pedidos previos y se acepta para uno nuevo.
- [ ] Con dos descuentos no combinables aplicables, el sistema aplica solo el de
      mayor beneficio; con dos combinables, los suma.
- [ ] Un descuento automático aplica sin código; uno con cupón solo aplica con
      el código válido.
- [ ] Un descuento fuera de su rango de fechas o inactivo no aplica.
- [ ] Generar masivamente N cupones de un solo uso; cada uno se redime una sola
      vez.
- [ ] Un cupón con límite global agotado se rechaza; uno con límite por cliente
      alcanzado se rechaza solo para ese cliente.
- [ ] Intentar aplicar dos cupones en una orden es rechazado.
- [ ] Un código de cupón en minúsculas y con espacios se valida correctamente
      tras normalización.
- [ ] Emitir una gift card con saldo, redimirla parcialmente y confirmar que el
      saldo restante queda disponible.
- [ ] Una gift card expirada, agotada o deshabilitada no se puede redimir.
- [ ] Una gift card en moneda distinta a la de la orden es rechazada.
- [ ] Completar una compra acredita puntos según la tasa de la tienda, sobre el
      monto tras descuentos.
- [ ] Redimir puntos como pago parcial respeta el tope de % de la orden y la tasa
      de conversión configurada.
- [ ] Cancelar/reembolsar una orden revierte los puntos acreditados.
- [ ] Puntos que superan su periodo de expiración dejan de estar disponibles.
- [ ] Un cliente sin compra verificada no puede crear una review del producto.
- [ ] Una review recién creada queda pendiente y no altera el rating agregado
      hasta ser aprobada.
- [ ] Tras aprobar reviews, el rating agregado promedia solo las aprobadas.
- [ ] Un cliente no puede crear una segunda review del mismo producto.
- [ ] Suscribirse al newsletter exige confirmación por email (doble opt-in) y se
      puede dar de baja.
- [ ] Exportar suscriptores produce un CSV filtrado por tienda y estado.
- [ ] Ningún recurso de marketing de una tienda es visible o aplicable desde
      otra tienda.
- [ ] Una redención repetida con la misma `Idempotency-Key` devuelve el
      resultado original sin doble efecto.

## Flujo principal

### Aplicación de promociones en checkout
1. El cliente arma su carrito en una tienda (`storeId`) y, opcionalmente,
   introduce un código de cupón y/o gift card.
2. El motor evalúa los descuentos **automáticos** y, si hay cupón, el descuento
   asociado, validando condiciones (mínimo, primer pedido, rol), vigencia y
   límites de uso.
3. El motor resuelve la combinabilidad: aplica el descuento de mayor beneficio o
   suma los combinables, sobre el subtotal pre-impuestos.
4. Se calculan impuestos y envío sobre el subtotal ya descontado.
5. El cliente puede aplicar **puntos** (hasta el tope) y/o **gift card** como
   pago parcial, reduciendo el total a pagar.
6. Al confirmar y pagar la orden, se **consumen** los usos del cupón, se
   **descuenta** el saldo de la gift card y se **acreditan** los puntos ganados,
   todo bajo la `Idempotency-Key` de la mutación.
7. Si la orden se cancela o reembolsa, se **revierten** puntos y consumos
   asociados según corresponda.

### Ciclo de review
1. El cliente con una orden completada que incluye el producto crea una review
   (rating 1–5 + texto).
2. La review queda **pendiente**; el cliente puede editarla mientras siga
   pendiente.
3. Un moderador **aprueba o rechaza** la review.
4. Al aprobarse, la review se publica y **recalcula** el rating agregado del
   producto.

## Casos borde y manejo de errores
- **Cupón inexistente / mal escrito** → se rechaza con error claro tras
  normalización; no se aplica descuento.
- **Cupón fuera de vigencia o inactivo** → rechazado; el resto del carrito sigue
  válido.
- **Límite global agotado vs. por cliente alcanzado** → mensajes distintos; el
  por-cliente no bloquea a otros clientes.
- **Dos cupones en una orden** → se rechaza el segundo; se mantiene el primero.
- **Descuentos no combinables empatados** → se elige determinísticamente el de
  mayor beneficio (desempate por regla estable, ej. id/fecha).
- **Gift card en otra moneda** → rechazada antes de aplicar.
- **Gift card con saldo menor al total** → redención parcial; el resto se cubre
  con otro método de pago.
- **Gift card expirada/deshabilitada/agotada** → rechazada con estado explícito.
- **Redención de puntos sobre el tope** → se acota al máximo permitido, no se
  rechaza toda la operación.
- **Acreditación de puntos en orden no pagada** → no se acreditan hasta el pago.
- **Cancelación/reembolso tras acreditar puntos** → reversión; si los puntos ya
  se gastaron, se maneja como saldo negativo/ajuste según política de la tienda.
- **Review sin compra verificada** → rechazada.
- **Segunda review del mismo producto** → rechazada; se sugiere editar la
  existente si sigue pendiente.
- **Doble opt-in no confirmado** → la suscripción permanece "pendiente" y no se
  exporta como activa.
- **Reintento con misma `Idempotency-Key`** → devuelve el resultado original;
  nunca duplica consumo ni acumulación.
- **Aislamiento entre tiendas** → cualquier intento de aplicar un recurso de otra
  tienda se rechaza como no encontrado.

## Asunciones
- Los descuentos no se apilan por defecto; solo se suman los marcados como
  combinables, y entre no combinables gana el de mayor beneficio para el cliente.
- Existen dos tipos de descuento (% y monto fijo), ambos con tope máximo
  opcional.
- El alcance de un descuento es producto, categoría/colección o subtotal de la
  orden; no aplica a envío en esta fase.
- Las condiciones (mínimo de compra, primer pedido, rol de cliente) se combinan
  con AND.
- Un descuento puede ser automático o requerir cupón, y tiene vigencia y flag
  activo/inactivo.
- Los descuentos se calculan sobre el subtotal antes de impuestos y envío.
- Los cupones soportan código único reutilizable o generación masiva de códigos
  de un solo uso, con límites de uso global y por cliente.
- Se acepta un solo cupón por orden; los códigos son case-insensitive y
  normalizados.
- Las gift cards las emite el admin y/o se compran como producto; funcionan como
  método de pago con redención parcial, expiración opcional y estados, y su
  moneda debe coincidir con la de la orden.
- Los reward points se ganan por unidad de moneda gastada tras descuentos (tasa
  por tienda), se canjean como pago parcial con tope y tasa configurables, se
  acreditan al pagar, se revierten en cancelación/reembolso y expiran por
  configuración de tienda.
- Solo clientes con compra verificada pueden dejar review; toda review pasa por
  moderación previa; escala 1–5; rating agregado solo de aprobadas; una review
  por cliente y producto, editable mientras esté pendiente.
- La newsletter usa doble opt-in y permite baja; el envío masivo se delega a
  herramientas externas; los suscriptores se exportan en CSV filtrable por
  tienda y estado.
- Cada recurso de marketing pertenece a una tienda (`storeId`) y no cruza entre
  tiendas.
- Esta fase entrega dominio + API (backend) de los tres módulos; la integración
  con carrito/órdenes se hace vía eventos/puertos respetando idempotencia; la
  Admin UI queda fuera o como capa mínima.
