# Sprint 1 · r14 — Pagos (payments)

> Estado: 🟡 parcial · Origen: `fase-4-pagos-envios-impuestos` + PLAN_REFORCE F5 · Hito: F5 (Pagos manual + Mercado Pago)
> Módulo: `packages/modules/payments` · Doc relacionada: [`providers/como-escribir-un-provider.md`](providers/como-escribir-un-provider.md)

## Resumen

Sistema de **providers (plugins)** de pago extensible: registry en memoria,
contrato `PaymentProvider` (`authorize`/`capture`/`refund`/`void`/`handleWebhook`),
webhooks con verificación de firma + idempotencia + reintentos + tolerancia a
desorden, reembolsos totales/parciales desde admin, y pago manual/transferencia/
efectivo. En el MVP los medios reales son **manual + Mercado Pago**. Equivale al
núcleo de cobro de la plataforma.

## Historia de usuario

> Como comerciante, quiero cobrar con distintos medios de pago de forma segura e
> idempotente, atada a la orden real; como integrador, quiero escribir un
> provider implementando un contrato claro, sin tocar el núcleo.

## Alcance

**Dentro:**
- Contrato `PaymentProvider` en `domain` + registry que indexa por `code`.
- Providers registrados al arranque como providers de NestJS.
- Habilitación/credenciales por tienda en BD (cifradas), nunca expuestas.
- Adapters: Mercado Pago, Stripe, pago manual/transferencia, efectivo.
- Webhooks por provider con firma, idempotencia (`eventId`), reintentos y
  tolerancia a desorden.
- Reembolsos totales y parciales desde admin.
- Validación de autorización contra la orden real.

**Fuera:**
- Carga dinámica de plugins en runtime.
- Reintegro automático de stock al reembolsar.
- Facturación electrónica / CFDI.

## Requisitos funcionales

### Sistema de providers
1. El módulo define un **puerto-contrato** `PaymentProvider` en `domain` y un
   **registry** que indexa implementaciones por `code` único.
2. Los providers se **registran en el arranque** como providers de NestJS; no hay
   descubrimiento ni carga de código en runtime.
3. La **habilitación por tienda** y la configuración/credenciales se persisten en
   BD (`StorePaymentMethod`).
4. Las **credenciales y secretos por tienda** se almacenan cifrados y nunca se
   devuelven en respuestas ni se escriben en logs.

### Pagos
5. `PaymentProvider` expone `authorize`, `capture`, `refund`, `void`,
   `handleWebhook`, todos devolviendo `Result<...>` de `@mitama/core`.
6. Dos modos: **auth+capture** en dos pasos y **captura inmediata (sale)**.
7. Cada intento de pago se persiste como `Payment` ligado a la orden, con
   `providerCode`, `amount`, `currency`, `status`, `providerReference` y timeline.
8. **Estados de pago:** `pending`, `authorized`, `paid`, `partially_refunded`,
   `refunded`, `failed`, `voided`, `cancelled`, gobernados por máquina de estados.
9. **Pago manual/transferencia y efectivo** no llaman a pasarela: crean un
   `Payment` en `pending` que un operador marca como pagado manualmente, con
   registro en activity-log y permiso `payments.update`.

### Webhooks
10. Endpoint por provider: `POST /payments/webhooks/:providerCode`.
11. Cada provider **verifica la firma** (HMAC/secret); firma inválida → `401`,
    no se procesa.
12. El cuerpo crudo se **persiste primero** (`PaymentWebhookEvent`) y se procesa
    después.
13. Idempotencia por `eventId` del provider bajo **índice único**; evento ya visto
    → `200` sin re-ejecutar efectos.
14. Tolerancia a **desorden**: un evento más antiguo nunca pisa un estado más
    nuevo.
15. Error transitorio → **5xx** para forzar reintento; reintento propio con
    backoff y tope, tras el cual el evento queda `failed` para revisión manual.

### Reembolsos
16. Totales y parciales desde admin con permiso `payments.refund`.
17. Un parcial **no excede** lo cobrado menos lo ya reembolsado.
18. Asíncrono: se crea en `pending`, se confirma por webhook, mueve el
    `paymentStatus` a `partially_refunded` o `refunded`.
19. El reembolso **no reintegra stock** automáticamente; se registra como acción
    de inventario pendiente.

### Validación contra orden real (PLAN_REFORCE F5)
20. Puerto `OrderForPaymentsPort` con vista mínima `(id, storeId, currencyCode,
    total, paidAmount, paymentStatus, status)`. `AuthorizePaymentUseCase` valida:
    la orden existe; `storeId` coincide; `currency` coincide; `amount > 0` y
    `amount <= total - paidAmount`; `paymentStatus` no está en
    `paid|refunded|partially_refunded|voided|cancelled`.

## Reglas de negocio

- Un evento de webhook con el mismo `eventId` se procesa **exactamente una vez**.
- La suma de reembolsos de una orden nunca supera el monto cobrado.
- Transición de estado inválida se rechaza; no muta el agregado.
- Las credenciales de provider nunca cruzan el borde de la API hacia el cliente.
- Comunicación entre módulos por **eventos** del bus, no imports directos
  (`payments` emite, `orders` reacciona).

## Asunciones

- Registry en memoria poblado por providers de NestJS, no carga dinámica.
- Adapters en `payments/infra`; habilitación/credenciales por tienda en BD,
  cifradas.
- Estados de pago como máquina; pago manual/efectivo sin pasarela.
- Webhook por provider con firma; idempotencia por `eventId` único; persistencia
  cruda antes de procesar; reintento con backoff y tope.
- Reembolsos desde admin con `payments.refund`; parcial ≤ saldo; no reintegra
  stock.

## Criterios de aceptación

- [ ] Un provider nuevo se registra solo implementando el contrato y declarándose
      en el módulo, sin tocar `orders` ni `apps/api`.
- [ ] `GET` de métodos por tienda devuelve solo los habilitados/elegibles, sin
      secretos.
- [ ] `authorize` + `capture` mueve la orden a `paid`; `void` sobre una
      autorización la mueve a `voided`.
- [ ] Un pago manual/efectivo se crea en `pending` y un operador con permiso lo
      marca pagado; queda en activity-log.
- [ ] **No es posible autorizar un monto distinto al de la orden.**
- [ ] Dos webhooks con el mismo `eventId` producen un solo efecto; el segundo
      responde `200` sin re-ejecutar.
- [ ] Un webhook con firma inválida responde `401` y no altera estado.
- [ ] Un webhook transitorio responde `5xx`; al reintentar con éxito el estado
      avanza.
- [ ] Un webhook "antiguo" recibido tras uno "nuevo" no revierte el estado.
- [ ] Un reembolso parcial reduce el saldo reembolsable; al agotarlo, la orden
      queda `refunded`; exceder el saldo es rechazado.
- [ ] Pago `paid` → orden `confirmed` + stock descontado + email encolado.

## Estado

**Entregado (primer corte):** módulo `payments` con registry de providers,
contrato `PaymentProvider`, casos de uso (authorize/capture/void/refund/
handle-webhook/mark-manual-paid), webhooks idempotentes con firma + reintentos,
validación de `AuthorizePaymentUseCase` contra la orden real
(`OrderForPaymentsPort` + `PrismaOrderForPayments`). Adapters Prisma + in-memory.

**Pendiente (F5 segundo corte — bloqueante MVP):**
- Adapter real **Mercado Pago** en `payments/infra`: SDK oficial o cliente HTTP;
  verificación de firma del webhook **antes** de parsear JSON; `webhookSecret`
  desde `StorePaymentMethod.encryptedCredentials` (descifrar; hoy en claro/env via
  `EnvPaymentProviderConfigResolver`); crear preferencia/payment intent real en
  `authorize` y persistir `providerReference`.
- Webhook con **`storeId` en la unicidad** `(storeId, providerCode, eventId)`:
  derivar `storeId` desde el `paymentId` del payload antes de `claim` — alineado
  con [[sprint1_r20_db_baseline_constraints]].
