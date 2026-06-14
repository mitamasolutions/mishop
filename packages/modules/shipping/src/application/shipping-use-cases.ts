import { err, ok, type EventBus, type Result, type UseCase } from '@mitama/core';
import type { ShippingProviderRegistry } from '../domain/shipping-provider';
import { methodCoversAddress, type ShippingRate, type ShippingRateRequest } from '../domain/shipping-method.entity';
import type { ShippingMethodRepository } from '../domain/shipping-method.repository';
import { Shipment, type ShipmentStatus } from '../domain/shipment.entity';
import type { ShipmentRepository } from '../domain/shipment.repository';
import { InvalidShipmentTransitionError, ShipmentNotFoundError } from '../domain/errors';
import { toShipmentOutput, type ShipmentOutput } from './shipping.dto';

export class CalculateShippingRatesUseCase implements UseCase<ShippingRateRequest, Result<ShippingRate[], Error>> {
  constructor(
    private readonly methods: ShippingMethodRepository,
    private readonly registry: ShippingProviderRegistry,
  ) {}

  async execute(input: ShippingRateRequest): Promise<Result<ShippingRate[], Error>> {
    const rates: ShippingRate[] = [];
    for (const method of await this.methods.findEnabledByStore(input.storeId)) {
      if (!methodCoversAddress(method, input.address)) continue;
      const provider = this.registry.get(method.providerCode);
      if (!provider) continue;
      const rate = await provider.calculateRate(method, input);
      if (rate.isErr()) continue;
      rates.push(rate.value);
    }
    return ok(rates);
  }
}

export class CreateShipmentUseCase implements UseCase<{ orderId: string; trackingNumber?: string | null; carrier?: string | null }, Result<ShipmentOutput, never>> {
  constructor(private readonly shipments: ShipmentRepository) {}

  async execute(input: { orderId: string; trackingNumber?: string | null; carrier?: string | null }): Promise<Result<ShipmentOutput, never>> {
    const shipment = Shipment.create(input);
    await this.shipments.save(shipment);
    return ok(toShipmentOutput(shipment));
  }
}

export class UpdateShipmentStatusUseCase implements UseCase<{ shipmentId: string; status: ShipmentStatus; trackingNumber?: string | null; carrier?: string | null }, Result<ShipmentOutput, ShipmentNotFoundError | InvalidShipmentTransitionError>> {
  constructor(
    private readonly shipments: ShipmentRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: { shipmentId: string; status: ShipmentStatus; trackingNumber?: string | null; carrier?: string | null }): Promise<Result<ShipmentOutput, ShipmentNotFoundError | InvalidShipmentTransitionError>> {
    const shipment = await this.shipments.findById(input.shipmentId);
    if (!shipment) return err(new ShipmentNotFoundError(input.shipmentId));
    shipment.updateTracking({ trackingNumber: input.trackingNumber, carrier: input.carrier });
    try {
      shipment.transition(input.status);
    } catch (error) {
      return err(error as InvalidShipmentTransitionError);
    }
    await this.shipments.save(shipment);
    if (shipment.status === 'shipped' || shipment.status === 'delivered') {
      await this.eventBus.publish({ name: 'shipment.notification_requested', occurredAt: new Date(), payload: { shipmentId: shipment.id, orderId: shipment.orderId, status: shipment.status } });
    }
    return ok(toShipmentOutput(shipment));
  }
}
