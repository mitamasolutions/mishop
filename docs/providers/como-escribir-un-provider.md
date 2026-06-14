# Cómo escribir un provider

Los providers viven en el monorepo y se registran en memoria al arrancar NestJS. No hay carga dinámica de paquetes en runtime.

## Pagos

Implementa `PaymentProvider` desde `@mitama/payments`:

```ts
import { ok, type Result } from '@mitama/core';
import type { PaymentProvider, PaymentProviderRequest, PaymentProviderResult } from '@mitama/payments';

export class MiPagoProvider implements PaymentProvider {
  readonly code = 'mi-pago';
  readonly displayName = 'Mi Pago';

  async authorize(input: PaymentProviderRequest): Promise<Result<PaymentProviderResult, Error>> {
    return ok({
      providerReference: `mi-pago_${input.paymentId}`,
      status: input.config.captureMode === 'manual' ? 'authorized' : 'paid',
      occurredAt: new Date(),
    });
  }

  async capture(input: PaymentProviderRequest): Promise<Result<PaymentProviderResult, Error>> {
    return ok({ providerReference: `capture_${input.paymentId}`, status: 'paid', occurredAt: new Date() });
  }

  async refund(input: PaymentProviderRequest & { refundId: string }): Promise<Result<PaymentProviderResult, Error>> {
    return ok({ providerReference: `refund_${input.refundId}`, status: 'pending', occurredAt: new Date() });
  }

  async void(input: PaymentProviderRequest): Promise<Result<PaymentProviderResult, Error>> {
    return ok({ providerReference: `void_${input.paymentId}`, status: 'voided', occurredAt: new Date() });
  }

  async handleWebhook() {
    throw new Error('Verifica firma, parsea eventId y devuelve PaymentWebhookResult');
  }
}
```

Regístralo en `PaymentsModule` agregándolo al arreglo de providers del `PaymentProviderRegistry`. Las credenciales por tienda vienen desde `StorePaymentMethod` y no deben exponerse en DTOs ni logs.

## Envíos

Implementa `ShippingProvider` y devuelve una tarifa para un `ShippingMethod` ya filtrado por elegibilidad de zona.

El provider debe soportar las estrategias configuradas por el método: `fixed`, `weight`, `cart-total` y `pickup`.

## Impuestos

Implementa `TaxProvider` y calcula desglose por línea. Para México, `mx-iva` usa reglas persistidas por `regionId + category`: `standard`, `zero` y `exempt`.

Si `pricesIncludeTax` es `true`, el total de línea no cambia y el provider separa base e impuesto. Si es `false`, el impuesto se suma al total.
