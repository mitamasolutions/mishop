# Cierre del Sprint 1 — Especificación funcional del MVP vendible

## Resumen

Especificación funcional para cerrar las 6 brechas bloqueantes que impiden
declarar el Sprint 1 (MVP ecommerce API + Admin) como "vendible": hardening del
admin, totales de checkout recalculados en el servidor, un sistema de plugins de
pago con activación/configuración por tienda (manual + Mercado Pago), un
subsistema de tareas programadas propio, las pantallas de administración
operativas y el cierre de CI/CD y deploy. No agrega features nuevas de negocio:
hace **confiable y operable** lo ya construido. Derivada de
[`sprint1_cierre_plan.md`](sprint1_cierre_plan.md) y el [ROADMAP](../ROADMAP.md).

## Historia de usuario

> Como responsable del producto, quiero cerrar las brechas bloqueantes del Sprint
> 1 (seguridad del admin, totales correctos, cobro real con Mercado Pago, tareas
> automáticas, administración completa y deploy reproducible), para poder operar
> una venta de punta a punta y comercializar instalaciones del MVP con confianza.

## Alcance

**Dentro:**

- Hardening del Admin: sesión por cookie segura, CSP, env de build obligatoria.
- Recálculo server-side de subtotal, impuestos y envío en la creación de orden.
- Sistema de **plugins de pago** (patrón Strategy) con configuración y activación
  por tienda; plugins **manual** y **Mercado Pago** en el MVP.
- Subsistema de **tareas programadas propio** (estilo nopCommerce) que reemplaza
  el cron externo: despacho de outbox, liberación de reservas vencidas y drenado
  de la cola de emails.
- Pantallas de administración: Clientes, Pagos, Envíos, configuración de métodos
  de pago, tareas programadas; paginado real, búsqueda con debounce, permisos que
  deshabilitan acciones, dashboard con KPIs reales.
- Constraints de integridad en base de datos.
- CI con base de datos real y deploy reproducible.

**Fuera:**

- Tienda pública (`apps/web`) y POS (sprints posteriores).
- Módulos congelados **promotions, giftcards, reviews**: no se tocan; siguen
  compilando con tests verdes y fuera del checkout.
- Stripe y otros plugins de pago distintos de manual y Mercado Pago.
- Multi-instancia de la API, dominios cross-site entre API y Admin, y multi-tenant
  SaaS.
- Loyalty / reward points (Fase L diferida).

## Requisitos funcionales

### A. Hardening del Admin

1. El **refresh token** se entrega y mantiene en una cookie **HttpOnly, Secure,
   SameSite=Lax**; el `/auth/refresh` la lee de la cookie (no del cuerpo) y
   `/auth/logout` la limpia. El access token permanece solo en memoria del
   cliente. Se asume API y Admin bajo el mismo dominio/site.
2. El admin **no persiste** el refresh token en `localStorage`; solo conserva el
   usuario y la tienda activa.
3. El build de producción del admin **falla** si falta `NEXT_PUBLIC_API_URL`; no
   existe fallback a `localhost`.
4. El admin responde con cabeceras de seguridad: `Content-Security-Policy`,
   `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
5. El bypass de scoping por tienda (`skipStoreScope`) solo se usa en endpoints
   realmente globales (settings global, datos de referencia, activity-log global,
   auth, health).

### B. Totales de checkout recalculados en el servidor

6. Al confirmar el checkout, el servidor **recalcula** subtotal por línea, costo
   de envío e impuestos; los totales de la orden **nunca** provienen del carrito
   enviado por el cliente.
7. El **impuesto se calcula solo sobre el subtotal de productos**; el costo de
   envío **no se grava** en el MVP.
8. La tasa efectiva por línea se resuelve por **categoría de impuesto del
   producto + región de la tienda**, respetando el modo "precios con/sin impuesto
   incluido" de la tienda. Un producto **sin categoría** se trata como `standard`
   (16%) y se registra una advertencia.
9. El costo de envío se resuelve server-side según el método elegido y su
   elegibilidad por **zona**; el cálculo por peso usa el **peso de la variante**, y
   una variante **sin peso** cuenta como **peso 0**.
10. Si el método de envío elegido **deja de ser elegible** al recalcular (zona no
    cubierta), el checkout **se rechaza** y se pide re-elegir; no se sustituye por
    un método por defecto.
11. La orden guarda un **snapshot inmutable** que incluye `taxAmount` real por
    línea, `currencyCode` por línea y el método de envío resuelto en el servidor.
12. Se valida que el canal/tienda del producto coincida con el del carrito antes
    de confirmar.

### C. Sistema de plugins de pago (Strategy)

13. El core de `payments` define un contrato de plugin (`authorize`, `capture`,
    `refund`, `void`, `handleWebhook`) y un **registry**; cada método de pago es un
    plugin que reusa esa base. El MVP entrega **manual/transferencia** y **Mercado
    Pago**; el sistema admite plugins futuros sin tocar el core.
14. Cada plugin **declara su propia configuración** (descriptor de campos) y la
    **valida** (`configured` / `misconfigured`). La configuración y credenciales se
    guardan por tienda en base de datos; su cifrado es **condicional** (ver
    requisito 15).
15. El cifrado de los settings de plugin se controla con la variable de entorno
    **`SETTINGS_ENCRYPTION_KEY`**, que es **opcional**: si está **vacía/ausente**,
    los settings se **guardan y leen en plano**; si tiene **valor**, pasan por
    cifrado al guardar y descifrado al leer. En **ambos casos la API arranca sin
    problemas** (no es fail-closed). El cifrado es un mecanismo **general de
    settings**, no exclusivo de pagos.
16. Un método de pago aparece en los **selectores** (checkout y admin) solo si está
    **habilitado y bien configurado** para la tienda. Un método habilitado pero
    **mal configurado** se **excluye del checkout** y muestra una **alerta** en el
    admin. Si la tienda no tiene ningún método válido, el paso de pago indica "sin
    métodos de pago disponibles".
17. **Mercado Pago** opera con **Checkout Pro** (se crea una *preferencia* y el
    comprador paga en el flujo de MP por redirección) en modo **captura inmediata
    (sale)**: el pago pasa a `paid` al confirmarse por webhook, sin paso de captura
    separado. `authorize` persiste el `providerReference`.
18. **Pago manual/transferencia** no llama a pasarela: crea el pago en `pending` y
    un operador con permiso lo marca como pagado.
19. Los **webhooks** verifican la firma **antes** de parsear el cuerpo; un evento
    con firma inválida responde `401`. La idempotencia del webhook es por
    **(tienda, proveedor, eventId)**; el `storeId` se deriva del pago referido
    antes de registrar el evento. Un evento repetido responde `200` sin
    re-ejecutar; un evento más antiguo no revierte un estado más nuevo; un error
    transitorio responde `5xx` para forzar reintento.
20. No se puede autorizar un monto distinto al saldo pendiente de la orden
    (validación contra la orden real ya existente).

### D. Tareas programadas (estilo nopCommerce)

21. El proyecto ejecuta sus **propias tareas programadas** dentro de la API; se
    elimina la dependencia de cron externo. Cada tarea tiene nombre, tipo,
    intervalo en segundos, estado habilitado, y marcas de última ejecución/último
    éxito/último error.
22. Tareas por defecto y sus intervalos: **`dispatch-outbox` cada 60 s**,
    **`drain-email-queue` cada 60 s**, **`release-expired-reservations` cada 300
    s**, todos editables desde el admin.
23. La cola de emails se **drena** con reintentos y backoff (máx. 3 intentos)
    detrás de un puerto de envío; el adapter real es **SMTP configurable**, y si no
    hay SMTP configurado cae a un adapter de **log** (el job queda registrado, no
    se pierde).
24. Los eventos críticos (`payment.*`, `order.completed/cancelled/refunded`,
    `shipment.notification_requested`) se **publican vía outbox transaccional**
    para sobrevivir caídas del proceso.
25. El runner corre asumiendo **una sola instancia** de API; un lock por fila evita
    que una tarea se solape consigo misma.
26. La administración de tareas (habilitar/deshabilitar, editar intervalo,
    "ejecutar ahora", ver último resultado) está disponible solo para **Super
    Admin**.
27. Cada request lleva un **`requestId`** correlacionable propagado a los logs
    estructurados; se eliminan los `console.log` de runtime.

### E. Administración operativa

28. **Clientes:** listado con búsqueda y detalle con direcciones e historial de
    órdenes del cliente.
29. **Pagos:** intentos de pago por orden con su estado y referencia del
    proveedor, acción de "marcar como pagado" para manual y acción de **reembolso**
    (total o parcial) con confirmación.
30. **Envíos:** crear el envío de una orden con número de guía y carrier, cambiar
    su estado y notificar al cliente. Una orden tiene **un solo envío** en el MVP.
31. **Configuración de métodos de pago** por tienda (lee el descriptor del plugin,
    permite configurar/activar, muestra alerta si está mal configurado) y
    **administración de tareas programadas**.
32. Los listados usan **paginado real** (incluidos órdenes e inventario bajo
    stock), con tamaño de página por defecto **20** y **búsqueda con debounce**
    (≥300 ms).
33. Las acciones de mutación se **ocultan y deshabilitan** según el permiso del
    usuario (no solo el item del menú).
34. El **dashboard** muestra KPIs reales: órdenes de hoy, órdenes pendientes de
    pago, conteo de alertas de stock bajo e ingresos del día; sin placeholders.

### F. Integridad de datos, CI y deploy

35. `Product.handle` y `ProductVariant.sku` son únicos **solo entre filas
    activas** (`deleted_at IS NULL`), permitiendo reutilizar el handle/SKU tras un
    soft-delete.
36. `TaxRule.rate` no puede ser negativo.
37. La unicidad de eventos de webhook incluye `storeId`
    (`storeId, providerCode, eventId`).
38. El **CI** corre en **PR y push a `main`** con una base de datos Postgres real:
    lint, build, migraciones (`db:deploy`), seed y tests (incluido e2e). Un CI rojo
    bloquea el merge.
39. El CI **construye y publica imágenes a GHCR** etiquetadas por **SHA** y
    **`latest`**.
40. Existe un **script de deploy** reproducible que actualiza el código, aplica
    migraciones, levanta los servicios y termina solo si el healthcheck pasa, con
    rollback básico si falla. El `.env.example` documenta todas las variables
    (incluyendo `SETTINGS_ENCRYPTION_KEY` opcional, claves de Mercado Pago,
    `CORS_ORIGINS`, `NEXT_PUBLIC_API_URL`). La documentación de deploy ya **no**
    depende de cron externo.

## Reglas de negocio

- El servidor es la **única fuente de verdad** de precios, impuestos, envío y
  totales; manipular el carrito desde el cliente no altera la orden creada.
- Un método de pago solo participa en una venta si está **habilitado y bien
  configurado** para la tienda; mal configurado o inhabilitado nunca cobra y se
  alerta.
- Un evento de webhook produce efecto **exactamente una vez** por
  `(tienda, proveedor, eventId)`.
- Ningún efecto colateral crítico (consumo de stock, email, transición de estado)
  se pierde ante una caída: se procesa al reanudar vía outbox + tareas
  programadas.
- Las credenciales de pago nunca cruzan el borde de la API hacia el cliente ni se
  escriben en logs.
- Los módulos de marketing congelados no participan en el checkout del MVP.
- La operación es **single-store**: la tienda se resuelve del contexto, nunca del
  cuerpo de la petición en endpoints de administración.

## Criterios de aceptación

- [ ] El build de producción del admin falla si falta `NEXT_PUBLIC_API_URL`.
- [ ] El refresh token no es accesible desde JavaScript/consola del navegador; el
      ciclo login → refresh → logout funciona vía cookie HttpOnly.
- [ ] Las respuestas del admin incluyen las cabeceras CSP y de seguridad.
- [ ] Manipular `currentUnitPrice`, el costo de envío o el `taxTotal` del carrito
      desde el cliente no altera los totales de la orden creada.
- [ ] Una orden con líneas `standard`, `tasa 0%` y `exento` calcula `taxTotal`
      correcto y guarda el desglose por línea; el envío no suma impuesto.
- [ ] Un producto sin categoría de impuesto se cobra como `standard` con
      advertencia registrada.
- [ ] Si el método de envío deja de ser elegible al recalcular, el checkout se
      rechaza pidiendo re-elegir.
- [ ] Un método de pago mal configurado no aparece en el selector de checkout y
      dispara una alerta en el admin.
- [ ] La API arranca con o sin `SETTINGS_ENCRYPTION_KEY`. Con la clave presente,
      los settings de plugin se guardan cifrados y se leen descifrados; sin la
      clave, se guardan y leen en plano.
- [ ] Un pago con Mercado Pago (Checkout Pro) confirmado por webhook con firma
      válida deja la orden en `paid`/`confirmed`, consume stock y encola el email;
      firma inválida responde `401` sin mutar estado.
- [ ] Un webhook duplicado responde `200` sin re-ejecutar; un evento antiguo no
      revierte el estado; dos tiendas con el mismo `eventId` no colisionan.
- [ ] No es posible autorizar un monto distinto al saldo pendiente de la orden.
- [ ] Un pago manual se crea en `pending` y un operador con permiso lo marca como
      pagado.
- [ ] Si la API cae justo tras un `payment.paid`, al reanudar las tareas procesan
      el consumo de stock y el email; la cola de emails se drena con reintentos.
- [ ] Las tareas programadas corren sin cron externo, son administrables por Super
      Admin (habilitar/deshabilitar/intervalo/ejecutar ahora) y muestran su último
      resultado.
- [ ] Cada request en los logs lleva un `requestId` correlacionable.
- [ ] Una venta completa (cliente → pago → envío) se gestiona end-to-end desde el
      admin; ningún botón de mutación es visible/activo sin el permiso.
- [ ] Los listados de órdenes e inventario bajo stock usan paginado real (20 por
      página) y búsqueda con debounce; el dashboard muestra KPIs reales.
- [ ] Un reembolso parcial reduce el saldo reembolsable y, al agotarlo, deja la
      orden `refunded`; exceder el saldo es rechazado.
- [ ] Un producto soft-deleted permite dar de alta otro con el mismo handle/SKU.
- [ ] El CI con Postgres real bloquea el merge cuando lint, build, migración, seed
      o tests fallan, y publica imágenes a GHCR por SHA y `latest`.
- [ ] El script de deploy corre limpio en un VPS y termina solo si el healthcheck
      pasa.

## Flujo principal (venta end-to-end del MVP)

1. El super admin configura la tienda: habilita y configura el método **Mercado
   Pago** (credenciales cifradas) y/o **manual**, define métodos de envío con sus
   zonas y las reglas de impuesto.
2. El comprador (invitado por email) arma el carrito y avanza el checkout
   (dirección → envío → pago → confirmación).
3. Al confirmar, el servidor **recalcula** subtotal, envío e impuestos, reserva el
   stock y crea la orden con snapshot inmutable; el evento `order.created` queda en
   el outbox.
4. El comprador paga: si es **Mercado Pago**, completa el pago en Checkout Pro y MP
   notifica por **webhook** (firma verificada, idempotente por tienda); si es
   **manual**, el operador lo marca como pagado.
5. Al quedar `paid`, la orden pasa a `confirmed`, se **consume** el stock reservado
   y se **encola** el email de confirmación.
6. Las **tareas programadas** despachan el outbox, drenan la cola de emails y
   liberan reservas vencidas, sin intervención externa.
7. El operador gestiona desde el admin: ve cliente, pagos y envíos; crea el envío
   con tracking (notifica al cliente), o reembolsa total/parcialmente; el dashboard
   refleja el estado real.

## Casos borde y manejo de errores

- **Carrito manipulado** (precio/envío/impuesto alterados) → el servidor ignora
  los valores del cliente y usa los recalculados.
- **Método de envío no elegible al confirmar** → checkout rechazado, se pide
  re-elegir.
- **Tienda sin métodos de pago válidos** → el paso de pago muestra "sin métodos
  disponibles"; método mal configurado → alerta en admin y exclusión del selector.
- **`SETTINGS_ENCRYPTION_KEY` ausente/vacía** → los settings de plugin se guardan
  y leen en plano; la API arranca normalmente. Con clave presente → cifrado/
  descifrado transparente.
- **Webhook con firma inválida** → `401`, sin mutar estado.
- **Webhook duplicado / fuera de orden** → `200` sin re-ejecutar / no revierte
  estado.
- **Error transitorio en webhook o tarea** → `5xx` / reintento con backoff; tras el
  tope, el job/evento queda marcado para revisión, sin perderse.
- **SMTP no configurado** → los emails se registran vía adapter de log; el job no
  se pierde.
- **Caída de la API tras un commit** → outbox + tareas reanudan los efectos
  pendientes al volver.
- **Soft-delete + alta con mismo handle/SKU** → permitido por el índice único
  parcial.
- **Variante sin peso en envío por peso** → se asume peso 0 para esa línea.
- **CI rojo** (lint/build/migración/seed/test) → merge bloqueado.

## Asunciones

- Plugins de pago del MVP: **manual** y **Mercado Pago** (Checkout Pro, captura
  inmediata); Stripe y otros quedan como plugins futuros.
- Cifrado de settings de plugin **opcional** vía `SETTINGS_ENCRYPTION_KEY`: sin
  clave se guarda en plano, con clave se cifra/descifra; la API arranca en ambos
  casos. Es un mecanismo general de settings, no exclusivo de pagos.
- Método de pago mal configurado: excluido del checkout + alerta en admin; sin
  métodos válidos → "sin métodos de pago disponibles".
- Impuesto solo sobre el subtotal de productos (envío no gravado); producto sin
  categoría → `standard` 16% con advertencia.
- Método de envío no elegible al recalcular → checkout rechazado; envío por peso
  usa peso de la variante, peso 0 si falta.
- Tareas programadas in-app con intervalos por defecto 60/60/300 s, administrables
  por Super Admin; runner asume una sola instancia de API con lock por fila.
- Envío de emails por SMTP configurable con fallback a log.
- Una orden tiene un solo `Shipment` en el MVP.
- Dashboard con 4 KPIs (órdenes de hoy, pendientes de pago, alertas de stock bajo,
  ingresos del día); paginado por defecto de 20.
- Refresh token en cookie HttpOnly `SameSite=Lax` asumiendo mismo dominio entre
  API y Admin.
- Módulos congelados (promotions, giftcards, reviews) no se tocan.
- CI en PR y push a `main`, con publicación de imágenes a GHCR por SHA y `latest`.
</content>
