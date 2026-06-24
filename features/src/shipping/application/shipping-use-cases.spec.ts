import { describe, expect, it } from 'vitest';
import { err, InMemoryEventBus } from '@mitama/core';
import { ShippingProviderRegistry } from '../domain/shipping-provider';
import type { ShippingProvider } from '../domain/shipping-provider';
import { DefaultShippingProvider } from '../infra/default-shipping-provider';
import { InMemoryShipmentRepository } from '../infra/in-memory-shipment.repository';
import { InMemoryShippingMethodRepository } from '../infra/in-memory-shipping-method.repository';
import { CalculateShippingRatesUseCase, CreateShipmentUseCase, UpdateShipmentStatusUseCase } from './shipping-use-cases';

describe('shipping rates', () => {
  it('calcula tarifas fija, por peso y por total', async () => {
    const methods = new InMemoryShippingMethodRepository();
    await methods.save({ id: 'weight', storeId: 'store-1', providerCode: 'default', name: 'Peso', enabled: true, zoneIds: ['zone-1'], strategy: 'weight', baseAmount: 20, perKgAmount: 10, freeOverAmount: null });
    await methods.save({ id: 'cart-total', storeId: 'store-1', providerCode: 'default', name: 'Gratis desde 500', enabled: true, zoneIds: ['zone-1'], strategy: 'cart-total', baseAmount: 80, perKgAmount: 0, freeOverAmount: 500 });
    const useCase = new CalculateShippingRatesUseCase(methods, new ShippingProviderRegistry([new DefaultShippingProvider()]));

    const result = await useCase.execute({ storeId: 'store-1', address: { zoneId: 'zone-1' }, cartTotal: 600, weightKg: 3 });

    expect(result.isOk()).toBe(true);
    expect(result.value).toEqual(expect.arrayContaining([
      expect.objectContaining({ methodId: 'weight', amount: 50 }),
      expect.objectContaining({ methodId: 'cart-total', amount: 0 }),
    ]));
  });

  it('excluye métodos sin cobertura y conserva pickup si está habilitado', async () => {
    const useCase = new CalculateShippingRatesUseCase(new InMemoryShippingMethodRepository(), new ShippingProviderRegistry([new DefaultShippingProvider()]));

    const result = await useCase.execute({ storeId: 'default', address: { zoneId: 'outside' }, cartTotal: 100, weightKg: 1 });

    expect(result.isOk()).toBe(true);
    expect(result.value).toEqual([expect.objectContaining({ methodId: 'pickup-default', amount: 0 })]);
  });

  it('omite un método cuyo provider falla y cotiza los demás', async () => {
    const methods = new InMemoryShippingMethodRepository();
    await methods.save({ id: 'ok', storeId: 'store-1', providerCode: 'default', name: 'OK', enabled: true, zoneIds: ['zone-1'], strategy: 'fixed', baseAmount: 50, perKgAmount: 0, freeOverAmount: null });
    await methods.save({ id: 'bad', storeId: 'store-1', providerCode: 'failing', name: 'Falla', enabled: true, zoneIds: ['zone-1'], strategy: 'fixed', baseAmount: 10, perKgAmount: 0, freeOverAmount: null });
    const failingProvider: ShippingProvider = { code: 'failing', calculateRate: async () => err(new Error('falló')) };
    const useCase = new CalculateShippingRatesUseCase(methods, new ShippingProviderRegistry([new DefaultShippingProvider(), failingProvider]));

    const result = await useCase.execute({ storeId: 'store-1', address: { zoneId: 'zone-1' }, cartTotal: 100, weightKg: 1 });

    expect(result.isOk()).toBe(true);
    expect(result.value).toEqual(expect.arrayContaining([expect.objectContaining({ methodId: 'ok', amount: 50 })]));
    expect(result.value).not.toEqual(expect.arrayContaining([expect.objectContaining({ methodId: 'bad' })]));
  });
});

describe('shipments', () => {
  it('publica notificación al marcar enviado', async () => {
    const shipments = new InMemoryShipmentRepository();
    const eventBus = new InMemoryEventBus();
    const events: string[] = [];
    eventBus.subscribe('shipment.notification_requested', (event) => events.push(event.name));
    const created = await new CreateShipmentUseCase(shipments).execute({ orderId: 'order-1' });

    const result = await new UpdateShipmentStatusUseCase(shipments, eventBus).execute({ shipmentId: created.value.id, status: 'shipped', trackingNumber: 'TRACK1', carrier: 'DHL' });

    expect(result.isOk()).toBe(true);
    expect(events).toEqual(['shipment.notification_requested']);
  });
});
