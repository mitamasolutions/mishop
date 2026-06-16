import { InMemoryEventBus } from '@mitama/core';
import type {
  CheckoutShippingResolveInput,
  CheckoutShippingResolveResult,
  CheckoutShippingResolverPort,
  CheckoutTaxCalculationInput,
  CheckoutTaxCalculationResult,
  CheckoutTaxResolverPort,
} from '@mitama/contracts';
import { InMemoryCheckoutCartReader } from '../infra/in-memory-checkout-cart.reader';
import { InMemoryOrderRepository } from '../infra/in-memory-order.repository';
import { InMemoryStockReservationService } from '../infra/in-memory-stock-reservation.service';
import type { EmailQueue } from '../domain/email-queue';

export class MemoryEmailQueue implements EmailQueue {
  readonly jobs: string[] = [];
  async enqueue(input: { templateCode: string }): Promise<void> {
    this.jobs.push(input.templateCode);
  }
}

/**
 * Resolver de envío configurable: por defecto cubre la zona y devuelve un
 * monto fijo (5). El test puede sustituir `eligible` o `amount` para forzar
 * casos borde (zona no cubierta, método no encontrado).
 */
export class FakeShippingResolver implements CheckoutShippingResolverPort {
  eligible = true;
  amount = 5;
  methodId = 'flat';
  providerCode = 'default';
  name = 'Fijo';

  async resolve(input: CheckoutShippingResolveInput): Promise<CheckoutShippingResolveResult> {
    if (!this.eligible) {
      return { ok: false, error: { code: 'method-not-eligible-for-zone', message: `Zona ${input.address?.zoneId ?? '(sin zona)'} no cubierta` } };
    }
    return { ok: true, value: { methodId: this.methodId, providerCode: this.providerCode, name: this.name, amount: this.amount } };
  }
}

/**
 * Resolver de impuestos configurable por categoría: por defecto aplica 16 %
 * a líneas `standard` y 0 % al resto.
 */
export class FakeTaxResolver implements CheckoutTaxResolverPort {
  rates: Record<string, number> = { standard: 0.16, zero: 0, exempt: 0 };

  async calculate(input: CheckoutTaxCalculationInput): Promise<CheckoutTaxCalculationResult> {
    const lines = input.lines.map((line) => {
      const category = (line.taxCategory as 'standard' | 'zero' | 'exempt' | null) ?? 'standard';
      const rate = this.rates[category] ?? 0;
      const taxableAmount = round(line.unitPrice * line.quantity);
      const taxAmount = round(taxableAmount * rate);
      return { lineId: line.lineId, taxCategory: category, taxRate: rate, taxableAmount, taxAmount, total: round(taxableAmount + taxAmount) };
    });
    const subtotal = round(lines.reduce((s, l) => s + l.taxableAmount, 0));
    const taxTotal = round(lines.reduce((s, l) => s + l.taxAmount, 0));
    return { subtotal, taxTotal, total: round(subtotal + taxTotal), lines, warnings: [] };
  }
}

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Contexto compartido por los tests de los casos de uso de `orders`: expone los
 * adapters in-memory ya cableados, un spy de eventos y un drenador de outbox.
 * Cada spec construye el caso de uso concreto que ejercita con estos puertos.
 */
export function makeContext() {
  const orders = new InMemoryOrderRepository();
  const carts = new InMemoryCheckoutCartReader();
  const stock = new InMemoryStockReservationService();
  const bus = new InMemoryEventBus();
  const email = new MemoryEmailQueue();
  const taxResolver = new FakeTaxResolver();
  const shippingResolver = new FakeShippingResolver();
  const events: string[] = [];
  bus.subscribe('order.created', (event) => events.push(event.name));
  bus.subscribe('payment.authorized', (event) => events.push(event.name));
  bus.subscribe('payment.paid', (event) => events.push(event.name));
  bus.subscribe('order.cancelled', (event) => events.push(event.name));
  async function drainOutbox(): Promise<void> {
    while (orders.outbox.length > 0) {
      const event = orders.outbox.shift();
      if (!event) break;
      await bus.publish({ name: event.name, occurredAt: new Date(), payload: event.payload });
    }
  }
  return { carts, stock, bus, email, orders, events, taxResolver, shippingResolver, drainOutbox };
}

export function readyCart(id: string) {
  return {
    id,
    storeId: 'store-1',
    regionId: 'region-mx',
    pricesIncludeTax: false,
    channel: 'web' as const,
    customerId: `customer-${id}`,
    email: `${id}@example.com`,
    shippingAddress: { line1: 'Uno', zoneId: 'zone-cdmx' },
    billingAddress: { line1: 'Uno' },
    // El monto que pone el cliente NO se usa: el resolver server-side
    // decide el costo real.
    shippingMethod: { id: 'flat', name: 'Fijo', amount: 999 },
    paymentMethod: { provider: 'manual', method: 'offline' },
    lines: [
      {
        cartLineId: `line-${id}`,
        variantId: 'v1',
        productId: 'p1',
        productTitle: 'Producto',
        variantTitle: 'Default',
        sku: 'SKU',
        quantity: 1,
        currencyCode: 'MXN',
        unitPrice: 10,
        stockLocationId: 'loc-1',
        taxCategory: 'standard' as const,
        weightKg: 0.5,
      },
    ],
  };
}
