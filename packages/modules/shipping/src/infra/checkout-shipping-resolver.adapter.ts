import { Injectable } from '@nestjs/common';
import type {
  CheckoutShippingResolveInput,
  CheckoutShippingResolveResult,
  CheckoutShippingResolverPort,
} from '@mitama/contracts';
import type { ShippingMethodRepository } from '../domain/shipping-method.repository';
import { methodCoversAddress } from '../domain/shipping-method.entity';
import { ShippingProviderRegistry } from '../domain/shipping-provider';

/**
 * Adapter del puerto `CheckoutShippingResolverPort` (r13 · sprint1_cierre).
 *
 * Reglas:
 * - El método elegido tiene que existir, estar habilitado y cubrir la zona
 *   del comprador. Si falla cualquiera, el checkout se rechaza para que se
 *   re-elija método (no se sustituye por un default).
 * - El monto del envío se calcula vía `ShippingProvider` (pickup → 0,
 *   fixed → baseAmount, weight → base + perKg·weight, cart-total →
 *   free_over_amount o baseAmount). El cliente nunca controla el monto.
 */
@Injectable()
export class CheckoutShippingResolverAdapter implements CheckoutShippingResolverPort {
  constructor(
    private readonly methods: ShippingMethodRepository,
    private readonly registry: ShippingProviderRegistry,
  ) {}

  async resolve(input: CheckoutShippingResolveInput): Promise<CheckoutShippingResolveResult> {
    const methods = await this.methods.findEnabledByStore(input.storeId);
    const method = methods.find((m) => m.id === input.methodId);
    if (!method) {
      return { ok: false, error: { code: 'method-not-found', message: `Método ${input.methodId} no existe en la tienda ${input.storeId} o está deshabilitado` } };
    }
    if (!method.enabled) {
      return { ok: false, error: { code: 'method-disabled', message: `Método ${input.methodId} está deshabilitado` } };
    }
    if (!methodCoversAddress(method, input.address)) {
      return { ok: false, error: { code: 'method-not-eligible-for-zone', message: `Método ${method.name} no cubre la zona ${input.address?.zoneId ?? '(sin zona)'}` } };
    }

    const provider = this.registry.get(method.providerCode);
    if (!provider) {
      return { ok: false, error: { code: 'method-not-found', message: `Provider ${method.providerCode} no registrado` } };
    }

    const rate = await provider.calculateRate(method, {
      storeId: input.storeId,
      address: input.address,
      cartTotal: input.subtotal,
      weightKg: input.weightKg,
    });
    if (rate.isErr()) {
      return { ok: false, error: { code: 'method-not-found', message: rate.error.message } };
    }

    return {
      ok: true,
      value: {
        methodId: method.id,
        providerCode: method.providerCode,
        name: method.name,
        amount: rate.value.amount,
      },
    };
  }
}
