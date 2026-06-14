# Fase 3 · Ventas (Clientes, Carrito y Órdenes)

## Resumen
Habilita el ciclo de venta completo de la plataforma: un comprador (registrado
o invitado) arma un **carrito persistente** server-side, atraviesa un
**checkout como máquina de estados** (dirección → envío → pago → confirmación) y
genera una **orden** con snapshot inmutable de precios y productos. Los estados
de orden y de pago son máquinas de estado con historial de transiciones, y cada
hito del proceso emite **eventos de dominio** que disparan efectos secundarios
desacoplados (emails transaccionales, reserva/liberación de inventario, futura
sincronización POS). Equivalente a *Customers + Shopping Cart + Checkout +
Orders + Order Notes* de nopCommerce, con inspiración en el modelo de Medusa.

## Historia de usuario
> Como comprador, quiero registrarme o comprar como invitado, agregar productos
> a un carrito persistente y completar un checkout guiado por pasos (dirección,
> envío, pago y confirmación), para recibir una orden confiable con precios y
> stock validados al momento de compra.
>
> Como administrador, quiero gestionar las órdenes —cambiar estados, anotar
> notas internas, reenviar la confirmación y cancelar liberando stock—, para
> operar las ventas de la tienda con trazabilidad completa.

## Alcance

**Dentro:**
- Módulo `customers`: registro vía API pública, perfil, múltiples direcciones,
  cliente invitado persistido y su conversión a cuenta.
- Módulo `cart`: carrito server-side persistente, ligado a tienda/canal, con
  validación de stock y precio vigentes; fusión de carrito invitado al iniciar
  sesión; expiración y purga de carritos inactivos.
- Módulo `orders`: creación de orden con numeración configurable por tienda,
  snapshot inmutable de líneas y direcciones, campo `channel` (`web` | `pos`).
- Checkout como **máquina de estados explícita**: carrito → dirección → envío →
  pago → confirmación, con posibilidad de retroceder antes de confirmar.
- Estado de **orden** y estado de **pago** como máquinas de estado separadas,
  cada una con historial de transiciones (quién, cuándo, de→a, motivo).
- **Reserva de inventario transaccional** con bloqueo optimista al confirmar el
  checkout, con expiración y liberación automática.
- **Idempotencia** en creación de órdenes vía header `Idempotency-Key`.
- **Eventos de dominio** sobre el `EventBus` de `@mitama/core` para los hitos del
  ciclo de venta, con suscriptores asíncronos.
- **Admin**: listado/filtrado de órdenes, cambio de estados, notas internas,
  reenvío de confirmación y cancelación con liberación de stock.
- **Emails transaccionales** base (orden creada, pagada, cancelada) con
  plantillas editables/versionadas y cola con reintentos.
- **Test de carrera** obligatorio sobre el último ítem de stock.

**Fuera:**
- Integración de pasarelas de pago reales (solo se define el puerto de pago y un
  adapter manual/offline).
- Origen de órdenes desde POS (`channel: pos`): el modelo lo soporta, pero el
  flujo POS no se implementa en esta fase.
- Devoluciones/RMA completas (nopCommerce *Returns*): queda solo la base de
  estados de pago `refunded`, sin flujo de devolución.
- Cupones, descuentos, impuestos avanzados y reglas promocionales.
- Verificación obligatoria de email y recuperación de contraseña del comprador.
- UI de storefront; el comprador interactúa por API.

## Requisitos funcionales

### Clientes (`customers`)
1. Registro de cliente comprador vía API pública con email + password; el email
   es único por tienda. El cliente comprador es una entidad **separada** del
   usuario admin del módulo `auth`.
2. El registro **no** exige verificación de email para comprar; la verificación
   queda opcional/posterior.
3. El perfil del cliente contiene nombre, apellido, email, teléfono (opcional) y
   fecha de alta; el password se almacena hasheado.
4. Un cliente puede tener **múltiples direcciones**; cada dirección puede
   marcarse como predeterminada de envío y/o de facturación, y una misma
   dirección puede servir para ambos usos.
5. El **guest checkout** persiste un cliente "invitado" (sin password) asociado a
   la orden por email, y puede convertirse luego en cuenta usando ese mismo
   email.

### Carrito (`cart`)
6. El carrito es server-side y se identifica por un token opaco
   (cookie/header) para invitados, o por `customer_id` cuando hay sesión.
7. Al iniciar sesión, el carrito de invitado se **fusiona** con el carrito del
   cliente autenticado.
8. Existe **un carrito activo** por cliente/sesión. Los carritos inactivos
   expiran a los 30 días (configurable) y se purgan.
9. El carrito está ligado a una **tienda (store) y canal**; precios y stock se
   resuelven por la ubicación/canal de esa tienda.
10. Cada línea de carrito guarda `variant_id`, cantidad y el **precio unitario
    capturado al agregar**. Los totales se recalculan en cada lectura validando
    precio y stock vigentes.
11. Si el precio vigente difiere del capturado, la línea se actualiza al precio
    vigente y se marca una advertencia; el cliente debe **confirmar** el cambio
    antes de avanzar a checkout.
12. Si el stock disponible es menor a la cantidad pedida, la línea se ajusta al
    máximo disponible (o se marca sin stock) y no se permite avanzar a pago con
    líneas inválidas.

### Checkout (máquina de estados)
13. El checkout avanza por fases explícitas: **carrito → dirección → envío →
    pago → confirmación**. Se puede retroceder a una fase previa mientras la
    orden no se confirme.
14. La fase de envío ofrece **métodos de envío configurables** con su costo.
15. El pago se modela mediante un **puerto de proveedor de pago**; la
    implementación inicial es un adapter manual/offline (sin pasarela real).
16. La **reserva de stock ocurre al confirmar el checkout** (creación de orden),
    no al agregar al carrito. La reserva es transaccional con **bloqueo
    optimista** (campo de versión) sobre el inventario por ubicación.
17. La reserva de stock tiene **expiración** (~15 min con pago pendiente); si el
    pago no se autoriza en ese plazo, la reserva se **libera automáticamente**.

### Órdenes (`orders`)
18. La numeración de orden es **configurable por tienda**: prefijo + secuencia
    incremental (p. ej. `WEB-000123`), única por tienda y sin reutilizar el
    secuencial.
19. La orden guarda un **snapshot inmutable** por línea (nombre de
    producto/variante, SKU, precio unitario, impuestos, cantidad) y del total,
    independiente de cambios futuros en el catálogo.
20. La orden incluye el campo `channel` (`web` | `pos`); en esta fase solo se
    origina `web`, pero el modelo soporta `pos`.
21. La orden referencia al cliente (registrado o invitado) y captura como
    **snapshot** las direcciones de envío y facturación, el método de envío y el
    método de pago.

### Estados, historial y eventos
22. El **estado de orden** es una máquina de estados: `pending → confirmed →
    completed`, con rama `cancelled`. Cada transición valida el estado de origen
    permitido.
23. El **estado de pago** es una máquina de estados **separada**: `pending →
    authorized → paid → (refunded | failed)`.
24. Cada transición (de orden y de pago) registra **historial**: quién, cuándo,
    estado origen → destino y motivo.
25. Se emiten **eventos de dominio** sobre el `EventBus` de `@mitama/core`:
    `order.created`, `payment.authorized`, `payment.paid`, `order.completed`,
    `order.cancelled`, `order.refunded`.
26. Los eventos son la **fuente de los efectos secundarios** (emails, liberación
    de stock, futura sincronización POS) y sus suscriptores se procesan de forma
    **asíncrona**, desacoplados del request HTTP.

### Idempotencia
27. La creación de orden acepta el header `Idempotency-Key`. Con la misma clave y
    el mismo payload se devuelve la **orden original** sin re-ejecutar la
    operación. Las claves se conservan 24 h.

### Admin
28. El administrador puede **listar y filtrar** órdenes (por estado, cliente,
    canal, fecha, número).
29. El administrador puede **cambiar el estado** de una orden respetando las
    transiciones válidas de la máquina de estados.
30. El administrador puede agregar **notas internas** a una orden, no visibles
    para el cliente.
31. El administrador puede **reenviar** el email de confirmación de una orden.
32. El administrador puede **cancelar** una orden; la cancelación **libera el
    stock** reservado/descontado, emite `order.cancelled` y solo se permite
    **antes de `completed`** (configurable).

### Emails transaccionales
33. Existen plantillas **editables y versionadas**, con variables, para los
    eventos: orden creada, orden pagada y orden cancelada.
34. El envío de emails usa una **cola con reintentos** (p. ej. 3 reintentos con
    backoff) detrás de un **puerto de proveedor de email**, con un adapter
    inicial de log/SMTP.

## Reglas de negocio
- El email del comprador es único por tienda; un invitado y una cuenta pueden
  compartir email solo en el flujo de conversión invitado → cuenta.
- Un carrito pertenece a exactamente una tienda y un canal; no se mezclan
  productos de tiendas distintas en el mismo carrito.
- No se puede confirmar el checkout si alguna línea tiene precio sin confirmar o
  stock insuficiente.
- El precio y el stock que valen para la orden son los **vigentes al confirmar**;
  una vez creada la orden, su snapshot es inmutable.
- La reserva de stock se descuenta del inventario por **ubicación**, nunca de un
  contador global por producto.
- Solo una transición de estado válida según la máquina correspondiente puede
  ejecutarse; cualquier otra se rechaza.
- La numeración de orden no se reutiliza aunque una orden se cancele.
- La liberación de stock al cancelar solo aplica si la orden aún tenía stock
  reservado o descontado y no estaba `completed`.
- Una misma `Idempotency-Key` con un payload distinto se considera conflicto y se
  rechaza (no devuelve la orden previa ni crea una nueva).

## Criterios de aceptación
- [ ] Un cliente puede registrarse vía API con email + password y obtener su
      perfil; un email duplicado en la misma tienda es rechazado.
- [ ] Un cliente puede crear, listar, editar y eliminar varias direcciones y
      marcar predeterminadas de envío y de facturación.
- [ ] Un invitado puede completar una compra sin cuenta; queda un cliente
      invitado persistido asociado a la orden por su email.
- [ ] Un invitado puede convertirse en cuenta registrada usando el mismo email.
- [ ] El carrito persiste entre requests y se recupera por token (invitado) o por
      `customer_id` (con sesión).
- [ ] Al iniciar sesión con un carrito de invitado, sus líneas se fusionan con el
      carrito del cliente.
- [ ] Un carrito inactivo más allá del umbral configurado deja de estar activo y
      es purgado.
- [ ] Si el precio de una línea cambió, el carrito lo refleja con advertencia y
      bloquea el avance a checkout hasta que el cliente lo confirme.
- [ ] Si el stock es insuficiente, la línea se ajusta o marca y el checkout no
      avanza a pago.
- [ ] El checkout solo permite pasar a la siguiente fase cuando la actual está
      completa, y permite retroceder antes de confirmar.
- [ ] Al confirmar el checkout se reserva stock transaccionalmente con bloqueo
      optimista y se crea la orden.
- [ ] Si el pago no se autoriza dentro del plazo de expiración, la reserva de
      stock se libera automáticamente.
- [ ] La orden se numera con prefijo + secuencia configurable por tienda, única y
      sin reutilizar el secuencial.
- [ ] La orden contiene un snapshot inmutable de líneas, direcciones, método de
      envío y método de pago que no cambia ante modificaciones del catálogo.
- [ ] La orden persiste el campo `channel` con valor `web`.
- [ ] La orden y el pago solo aceptan transiciones válidas según sus máquinas de
      estado; cada transición queda en el historial con autor, momento, origen,
      destino y motivo.
- [ ] Se emiten los eventos `order.created`, `payment.authorized`,
      `payment.paid`, `order.completed`, `order.cancelled` y `order.refunded` en
      los hitos correspondientes.
- [ ] Los suscriptores (emails, liberación de stock) reaccionan a los eventos sin
      bloquear el request HTTP.
- [ ] Crear una orden dos veces con la misma `Idempotency-Key` y el mismo payload
      devuelve la orden original sin duplicarla; con payload distinto se rechaza
      por conflicto.
- [ ] El admin puede listar/filtrar órdenes, cambiar estados válidos, agregar
      notas internas, reenviar la confirmación y cancelar.
- [ ] Cancelar una orden libera su stock y emite `order.cancelled`; cancelar una
      orden `completed` es rechazado.
- [ ] Existen plantillas editables y versionadas para orden creada, pagada y
      cancelada, con variables interpoladas.
- [ ] El envío de emails se encola y reintenta ante fallo según la política
      configurada.
- [ ] **Test de carrera:** ante múltiples órdenes simultáneas por el último ítem
      de stock, solo una tiene éxito y el resto falla con "stock insuficiente",
      sin sobreventa.

## Flujo principal
1. El comprador se registra (o continúa como invitado) vía API.
2. Agrega variantes al carrito; el sistema captura el precio vigente y valida el
   stock por ubicación de la tienda/canal.
3. El comprador inicia el checkout: ingresa/selecciona **dirección** de envío y
   facturación.
4. Selecciona el **método de envío** y su costo se suma al total.
5. Selecciona el **método de pago** (adapter manual/offline en esta fase).
6. **Confirma** la compra enviando `Idempotency-Key`:
   - Se valida nuevamente precio y stock.
   - Se **reserva el stock** transaccionalmente con bloqueo optimista.
   - Se crea la **orden** con numeración configurable y snapshot inmutable,
     estado `pending` y pago `pending`.
   - Se emite `order.created`.
7. El pago se autoriza (`payment.authorized`) y luego se captura
   (`payment.paid`); la orden pasa a `confirmed`. Se emiten los eventos y se
   encolan los emails correspondientes.
8. La orden se marca `completed` cuando corresponde, emitiendo `order.completed`.
9. En cualquier punto previo a `completed`, el admin puede cancelar: se libera el
   stock y se emite `order.cancelled`.

## Casos borde y manejo de errores
- **Precio cambiado entre agregar y checkout** → la línea se actualiza con
  advertencia; el checkout se bloquea hasta confirmación explícita del cliente.
- **Stock insuficiente al agregar** → la línea se ajusta al máximo disponible o
  se marca sin stock; no se permite avanzar a pago.
- **Stock agotado al confirmar (carrera)** → la reserva transaccional falla por
  bloqueo optimista; la orden no se crea y se devuelve "stock insuficiente".
- **Pago no autorizado dentro del plazo** → la reserva de stock se libera
  automáticamente y la orden queda en estado consistente (`cancelled` o
  reintentable, según configuración).
- **Reintento con `Idempotency-Key` igual y mismo payload** → se devuelve la
  orden original sin re-ejecutar.
- **`Idempotency-Key` igual con payload distinto** → se rechaza por conflicto.
- **Transición de estado inválida** (orden o pago) → se rechaza sin alterar el
  estado actual.
- **Cancelar una orden `completed`** → se rechaza (configurable).
- **Fusión de carritos con la misma variante** → se consolidan cantidades
  respetando el stock disponible.
- **Carrito de tienda/canal distinto** → no se permite mezclar; el comprador
  opera un carrito por tienda/canal.
- **Fallo de envío de email** → el job se reintenta según la política; agotados
  los reintentos, queda registrado como fallido sin afectar la orden.
- **Cliente invitado que ya existe como cuenta** → en la conversión, se vincula
  por email respetando la unicidad por tienda.

## Asunciones
- El cliente comprador es una entidad separada del usuario admin (`auth`);
  registro por API pública con email + password único por tienda.
- El registro no exige verificación de email para comprar.
- El perfil incluye nombre, apellido, email, teléfono opcional y fecha de alta;
  password hasheado.
- Múltiples direcciones por cliente, marcables como predeterminadas de envío y/o
  facturación; una dirección puede servir para ambos usos.
- El guest checkout persiste un cliente invitado (sin password), convertible a
  cuenta con el mismo email.
- Carrito server-side por token (invitado) o `customer_id` (sesión), con fusión
  al iniciar sesión.
- Un carrito activo por cliente/sesión; expiración a 30 días configurable y
  purga.
- Carrito ligado a tienda y canal; precios y stock por su ubicación/canal.
- Cada línea captura precio al agregar; totales recalculados en cada lectura.
- Cambio de precio → advertencia y confirmación obligatoria antes de checkout.
- Stock insuficiente → ajuste/marcado de línea y bloqueo del avance a pago.
- Checkout como máquina de estados carrito → dirección → envío → pago →
  confirmación, con retroceso antes de confirmar.
- Métodos de envío configurables con costo; puerto de pago con adapter
  manual/offline inicial.
- Reserva de stock al confirmar el checkout, transaccional con bloqueo optimista
  por ubicación.
- Reserva con expiración (~15 min) y liberación automática si no se autoriza el
  pago.
- Numeración configurable por tienda (prefijo + secuencia), única y sin reutilizar.
- Snapshot inmutable de líneas, direcciones, envío y pago en la orden.
- Campo `channel` (`web` | `pos`); en esta fase solo se origina `web`.
- Estado de orden `pending → confirmed → completed` (+ `cancelled`) y estado de
  pago `pending → authorized → paid → (refunded | failed)` como máquinas
  separadas con historial.
- Eventos de dominio en el `EventBus` de `@mitama/core` (`order.created`,
  `payment.authorized`, `payment.paid`, `order.completed`, `order.cancelled`,
  `order.refunded`) con suscriptores asíncronos.
- `Idempotency-Key` en creación de orden; misma clave + mismo payload devuelve la
  orden original; claves conservadas 24 h.
- Admin: listar/filtrar, cambiar estados válidos, notas internas, reenvío de
  confirmación y cancelación con liberación de stock (solo antes de `completed`).
- Plantillas de email editables/versionadas (orden creada, pagada, cancelada) y
  cola con reintentos detrás de un puerto de proveedor de email.
- Test de carrera obligatorio: solo una orden gana el último ítem, sin
  sobreventa.
