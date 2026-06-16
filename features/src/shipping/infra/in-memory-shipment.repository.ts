import { Injectable } from '@nestjs/common';
import type { Shipment } from '../domain/shipment.entity';
import type { ShipmentRepository } from '../domain/shipment.repository';

@Injectable()
export class InMemoryShipmentRepository implements ShipmentRepository {
  private readonly shipments = new Map<string, Shipment>();

  async findById(id: string): Promise<Shipment | null> {
    return this.shipments.get(id) ?? null;
  }

  async findByOrderId(orderId: string): Promise<Shipment[]> {
    return [...this.shipments.values()].filter((s) => s.orderId === orderId);
  }

  async save(shipment: Shipment): Promise<void> {
    this.shipments.set(shipment.id, shipment);
  }
}
