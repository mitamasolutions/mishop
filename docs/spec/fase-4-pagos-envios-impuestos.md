# Fase 4 · Pagos, envíos e impuestos

## Resumen

Habilita el cobro, el envío y el cálculo de impuestos de las órdenes mediante un
**sistema de providers (plugins)** extensible. Es la primera prueba de mitama-commerce
como plataforma: terceros (y nosotros) escriben adapters de pago/envío/impuesto contra
contratos estables sin tocar el núcleo. Dirigido a comerciantes LATAM (foco México/IVA)
que venden por web y, a futuro, POS.

## Historia de usuario

> Como comerciante que vende en línea, quiero cobrar con distintos medios de pago,
> ofrecer métodos de envío con tarifas por zona y calcular impuestos correctamente,
> para completar ventas de forma confiable y cumplir con la fiscalidad de mi región.

> Como desarrollador/integrador, quiero escribir un provider de pago, envío o impuesto
> implementando un contrato claro, para extender la plataforma sin modificar su núcleo.

## Alcance

**Dentro:**

- Tres módulos hexagonales nuevos: `payments`, `shipping`, `taxes`.
- Sistema de **registry de providers** en memoria, poblado al arranque por providers de NestJS.
- Contrato `PaymentProvider` (`authorize`, `capture`, `refund`, `void`, `handleWebhook`).
- Adapters de pago: **Mercado Pago, Stripe, pago manual/transferencia, efectivo**.
- Webhooks de pago con **verificación de firma, idempotencia, reintentos y tolerancia a desorden**.
- **Reembolsos totales y parciales** iniciados desde el admin.
- Contrato `ShippingProvider`: métodos por tienda, tarifas (fija, por peso, por total del carrito),
  zonas de envío (sobre `reference-data`), **pickup en tienda**.
- **Tracking de envíos** (número de guía, carrier, estado) con notificación al cliente.
- Impuestos: **categorías de impuesto por producto/variante**, IVA México (16 %, tasa 0 %, exento),
  precios **con/sin impuesto incluido** configurable por tienda.
- Documento **"Cómo escribir un provider"**.
- Tests e2e de webhooks (duplicado, reintento, desorden) + unitarios de tarifas e impuestos.

**Fuera:**

- Carga dinámica de código de plugins en runtime o instalación de paquetes externos (los adapters
  viven en el monorepo; el registry es en memoria).
- Integración real con APIs de carriers (FedEx, DHL, Estafeta): el tracking se actualiza manualmente.
- Reintegro automático de stock al reembolsar (queda como acción de inventario separada).
- Flujo de cobro del POS / sync offline (efectivo se modela pensando en POS, pero el POS es fase posterior).
- Facturación electrónica / CFDI ante el SAT.
- Cálculo de impuestos en tiempo de navegación del catálogo (solo en checkout).

## Requisitos funcionales

### Sistema de providers

1. Cada uno de los tres módulos define un **puerto-contrato** (`PaymentProvider`,
   `ShippingProvider`, `TaxProvider`) en su capa `domain`, y un **registry** que indexa
   las implementaciones por su `code` único.
2. Los providers se **registran en el arranque** como providers de NestJS; el registry los
   resuelve por `code`. No hay descubrimiento ni carga de código en runtime.
3. La **habilitación por tienda** y la configuración/credenciales se persisten en BD
   (p. ej. `StorePaymentMethod`, `StoreShippingMethod`); el código del adapter es interno al monorepo.
4. Las **credenciales y secretos por tienda** (API keys, webhook secrets) se almacenan cifrados,
   y nunca se devuelven en respuestas de la API ni se escriben en logs.

### Pagos

5. El contrato `PaymentProvider` expone `authorize`, `capture`, `refund`, `void` y `handleWebhook`,
   todos devolviendo `Result<...>` de `@mitama/core` (sin lanzar excepciones de dominio).
6. Se soportan **dos modos**: auth+capture en dos pasos y captura inmediata (sale); el modo lo
   decide cada provider/su configuración.
7. Cada intento de pago se persiste como entidad `Payment` ligada a la orden, con
   `providerCode`, `amount`, `currency`, `status`, `providerReference` (id externo) y un
   timeline de transiciones.
8. Los **estados de pago** de la orden son: `pending`, `authorized`, `paid`, `partially_refunded`,
   `refunded`, `failed`, `voided`, `cancelled`, gobernados por una máquina de estados que rechaza
   transiciones inválidas.
9. **Pago manual/transferencia y efectivo** no llaman a ninguna pasarela: crean un `Payment` en
   `pending` que un operador del admin marca como pagado manualmente, con registro en activity-log.

### Webhooks de pago

10. Existe un endpoint por provider: `POST /payments/webhooks/:providerCode`.
11. Cada provider **verifica la firma** del webhook (HMAC/secret). Firma inválida → `401` y no se
    procesa.
12. El cuerpo crudo del evento se **persiste primero** (`PaymentWebhookEvent`) y se procesa después.
13. La idempotencia se garantiza con el `eventId` del provider bajo **índice único**; un evento ya
    visto responde `200 OK` sin re-ejecutar efectos.
14. El procesamiento **tolera entrega fuera de orden**: un evento más antiguo nunca pisa un estado
    más nuevo de la orden/pago.
15. Ante error transitorio, el endpoint responde **5xx** para forzar reintento del provider; además
    hay reintento propio con backoff y un **tope de reintentos**, tras el cual el evento queda
    `failed` para revisión manual.

### Reembolsos

16. Los reembolsos (totales y parciales) se inician **desde el admin** por un usuario con permiso
    `payments.refund`.
17. Un reembolso parcial **no puede exceder** lo cobrado menos lo ya reembolsado.
18. El reembolso es asíncrono: se crea en `pending`, se confirma vía webhook del provider, y mueve
    el `paymentStatus` de la orden a `partially_refunded` o `refunded`.
19. El reembolso **no reintegra stock** automáticamente; se registra la intención como acción de
    inventario pendiente.

### Envíos

20. El contrato `ShippingProvider` calcula tarifas con tres estrategias: **fija, por peso y por
    total del carrito**.
21. Cada tienda configura sus **métodos de envío** y las **zonas** (`reference-data`) a las que aplican.
22. **Pickup en tienda** es un método con costo 0, sin dirección de entrega, disponible solo si la
    tienda lo habilita.
23. La **elegibilidad** de un método depende de que la dirección de destino caiga en una zona cubierta;
    si ningún método cubre la dirección, el checkout indica "sin envío disponible" para esa dirección.
24. El **tracking** se modela como entidad `Shipment` con `trackingNumber`, `carrier` y `status`
    (`pending`, `shipped`, `in_transit`, `delivered`, `cancelled`), actualizado manualmente desde el admin.
25. Cambiar un `Shipment` a `shipped`/`delivered` **encola una notificación al cliente** usando la cola
    de correos transaccionales existente (`OrderEmailJob`).

### Impuestos

26. Cada producto/variante se asocia a una **categoría de impuesto**: `standard` (16 %), `tasa 0 %`, `exento`.
27. El IVA México se modela como **reglas de tasa por categoría y región** (configurables, no hardcodeadas);
    el seed carga las tres tasas mexicanas.
28. Cada tienda configura si sus **precios se ingresan con impuesto incluido o sin impuesto**; el cálculo
    deriva el impuesto en consecuencia.
29. El cálculo de impuestos ocurre en **checkout** al construir la orden; el desglose se guarda por línea
    (`OrderLine`) y se totaliza en `taxTotal`.

### Documentación y pruebas

30. Se entrega `docs/providers/como-escribir-un-provider.md` documentando los tres contratos con un
    ejemplo mínimo de provider de pago.
31. Hay tests e2e de webhooks que simulan entrega duplicada, reintento tras fallo y evento fuera de orden;
    más unitarios de cada estrategia de tarifa y del cálculo de impuesto con adapters in-memory.

## Reglas de negocio

- Un evento de webhook con el mismo `eventId` se procesa **exactamente una vez** (at-most-once efectos,
  at-least-once entrega tolerada).
- La suma de reembolsos de una orden nunca supera el monto cobrado.
- Una transición de estado de pago/envío inválida se rechaza con error de dominio; no muta el agregado.
- Un método de envío solo se ofrece si su zona cubre la dirección de destino y la tienda lo tiene habilitado.
- El impuesto efectivo = tasa(categoría del producto, región de la tienda); `exento` y `tasa 0 %` producen
  impuesto 0 pero se distinguen en el desglose.
- `taxTotal` de la orden = suma de impuestos por línea; coherente con `subtotal`, `shippingTotal` y `total`.
- Las credenciales de provider nunca cruzan el borde de la API hacia el cliente.
- La comunicación entre módulos es por **eventos** del bus (`@mitama/core` / `EVENT_BUS`), no imports directos
  (p. ej. `payments` emite `PaymentCaptured`; `orders` reacciona).

## Criterios de aceptación

- [ ] Un provider de pago nuevo se registra solo implementando el contrato y declarándose en el módulo,
      sin tocar `orders` ni `apps/api`.
- [ ] `GET` de métodos disponibles por tienda devuelve solo los habilitados y elegibles, sin exponer secretos.
- [ ] `authorize` + `capture` mueve la orden a `paid`; `void` sobre una autorización la mueve a `voided`.
- [ ] Un pago manual/efectivo se crea en `pending` y un operador con permiso lo marca como pagado; queda
      registrado en activity-log.
- [ ] Enviar dos webhooks con el mismo `eventId` produce un solo efecto; el segundo responde `200` sin
      re-ejecutar (test e2e).
- [ ] Un webhook con firma inválida responde `401` y no altera ningún estado (test e2e).
- [ ] Un webhook que falla por error transitorio responde `5xx`; al reintentarlo con éxito el estado avanza
      correctamente (test e2e).
- [ ] Un webhook "antiguo" recibido después de uno "nuevo" no revierte el estado de la orden (test e2e de desorden).
- [ ] Un reembolso parcial reduce el saldo reembolsable; al agotarlo, la orden queda `refunded`; exceder el
      saldo es rechazado.
- [ ] Tarifa fija, por peso y por total del carrito devuelven el costo esperado para una dirección dada (unitarios).
- [ ] Una dirección fuera de toda zona cubierta no ofrece métodos de envío (salvo pickup si está habilitado).
- [ ] Cambiar un `Shipment` a `shipped` encola una notificación al cliente.
- [ ] Una orden con productos `standard`, `tasa 0 %` y `exento` calcula `taxTotal` correcto y guarda el desglose por línea.
- [ ] Con "precio con impuesto incluido" activado, el total no cambia pero el desglose separa base e impuesto;
      con "sin impuesto", el impuesto se suma encima.
- [ ] Existe `docs/providers/como-escribir-un-provider.md` con los tres contratos y un ejemplo funcional.
- [ ] `yarn lint` pasa (sin violar boundaries entre módulos) y `yarn test` pasa.

## Flujo principal

### Checkout con pago en línea

1. El cliente arma el carrito y elige dirección de envío.
2. `shipping` calcula los **métodos elegibles** y sus tarifas para la zona de la dirección.
3. `taxes` calcula el **impuesto por línea** según categoría y región, respetando el modo
   con/sin impuesto incluido de la tienda.
4. El cliente elige método de envío y medio de pago; se construye la orden (`subtotal`, `shippingTotal`,
   `taxTotal`, `total`) usando la idempotencia ya existente de `orders`.
5. `payments` ejecuta `authorize`/`capture` (o `sale`) contra el provider; se crea/actualiza el `Payment`.
6. El provider notifica el resultado por **webhook**: se verifica firma, se deduplica por `eventId`,
   se persiste y se procesa, moviendo la orden a `paid` (o `failed`).
7. `orders` reacciona al evento `PaymentCaptured` y avanza el estado de la orden; se notifica al cliente.

### Reembolso desde admin

1. Un operador con permiso `payments.refund` solicita reembolso total o parcial.
2. Se valida que el monto ≤ saldo reembolsable; se crea el reembolso en `pending` y se llama a `refund` del provider.
3. El provider confirma por webhook; el `paymentStatus` pasa a `partially_refunded` o `refunded`.
4. Se registra la acción en activity-log y se marca la intención de reintegro de stock como pendiente.

### Tracking de envío

1. El operador captura `trackingNumber` y `carrier` en el `Shipment` y lo marca `shipped`.
2. El sistema encola una notificación al cliente vía `OrderEmailJob`.
3. Actualizaciones posteriores (`in_transit`, `delivered`) repiten la notificación según corresponda.

## Casos borde y manejo de errores

- **Webhook duplicado** → segundo evento con mismo `eventId`: `200 OK`, sin re-ejecutar efectos.
- **Webhook con firma inválida** → `401`, no se persiste como procesado ni muta estado.
- **Webhook fuera de orden** → evento más antiguo que el estado actual: se ignora el efecto regresivo, se marca procesado.
- **Webhook con error transitorio** → `5xx` para forzar reintento; backoff propio; tras tope → `failed` para revisión manual.
- **Reembolso que excede el saldo** → rechazado con error de dominio, sin llamar al provider.
- **Captura sobre pago no autorizado** → transición inválida, rechazada.
- **Dirección sin zona cubierta** → no se ofrecen métodos de envío (salvo pickup habilitado); el checkout lo comunica.
- **Producto sin categoría de impuesto** → se aplica la categoría `standard` por defecto y se registra advertencia.
- **Tienda sin reglas de impuesto para su región** → impuesto 0 con advertencia; no bloquea el checkout.
- **Provider deshabilitado a mitad de checkout** → al confirmar el pago se revalida; si ya no está disponible, la orden no avanza a `paid`.
- **Credencial inválida/expirada del provider** → `authorize`/`capture` devuelve `Result` de error; la orden queda `pending`/`failed`, sin exponer detalles del secreto.

## Asunciones

- Tres módulos hexagonales nuevos (`payments`, `shipping`, `taxes`); el sistema de providers es un
  **registry en memoria** poblado por providers de NestJS, no carga dinámica de plugins externos.
- Los adapters (Stripe, Mercado Pago, manual, efectivo) viven en `payments/infra`; la habilitación y
  credenciales por tienda se guardan en BD; los secretos van cifrados y nunca se exponen.
- `PaymentProvider` expone `authorize`, `capture`, `refund`, `void`, `handleWebhook`, todos con `Result`
  de `@mitama/core`.
- Se soportan auth+capture en dos pasos y captura inmediata (sale), a elección del provider.
- Estados de pago: `pending`, `authorized`, `paid`, `partially_refunded`, `refunded`, `failed`, `voided`,
  `cancelled`, con máquina de estados.
- Pago manual/transferencia y efectivo no llaman a pasarela; se marcan pagados manualmente desde admin
  con registro en activity-log.
- Cada intento de pago se persiste como `Payment` con `providerReference` y timeline.
- Un endpoint de webhook por provider con verificación de firma; firma inválida → `401`.
- Idempotencia de webhooks vía `eventId` único en `PaymentWebhookEvent`; evento repetido → `200` sin re-ejecutar.
- Webhooks se persisten crudos antes de procesar; el handler tolera reintentos y desorden.
- Error transitorio → `5xx` + reintento con backoff y tope; tras tope, `failed` para revisión manual.
- Reembolsos totales/parciales desde admin con permiso `payments.refund`; parcial ≤ saldo reembolsable;
  confirmación por webhook.
- El reembolso no reintegra stock automáticamente en esta fase.
- `ShippingProvider` con tarifas fija, por peso y por total; métodos y zonas por tienda; pickup en tienda como método de costo 0.
- Elegibilidad por cobertura de zona de la dirección; sin cobertura → "sin envío disponible".
- Tracking como `Shipment` (`trackingNumber`, `carrier`, `status`), actualizado manualmente; cambios de
  estado encolan notificación vía `OrderEmailJob`.
- Categorías de impuesto por producto/variante (`standard 16 %`, `tasa 0 %`, `exento`); tasas por categoría+región
  configurables, sembradas para México.
- Precios con/sin impuesto incluido configurable por tienda; cálculo en checkout con desglose por línea en `taxTotal`.
- Se entrega `docs/providers/como-escribir-un-provider.md` y tests e2e de webhooks (duplicado, reintento, desorden)
  más unitarios de tarifas e impuestos.
