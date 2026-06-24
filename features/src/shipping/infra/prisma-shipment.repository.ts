import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/data';
import { Shipment, type ShipmentStatus } from '../domain/shipment.entity';
import type { ShipmentRepository } from '../domain/shipment.repository';

@Injectable()
export class PrismaShipmentRepository implements ShipmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Shipment | null> {
    const row = await this.prisma.shipment.findUnique({ where: { id } });
    return row ? Shipment.rehydrate({ orderId: row.orderId, trackingNumber: row.trackingNumber, carrier: row.carrier, status: row.status as ShipmentStatus, createdAt: row.createdAt, updatedAt: row.updatedAt }, row.id) : null;
  }

  async findByOrderId(orderId: string): Promise<Shipment[]> {
    const rows = await this.prisma.shipment.findMany({ where: { orderId }, orderBy: { createdAt: 'desc' } });
    return rows.map((row) =>
      Shipment.rehydrate(
        { orderId: row.orderId, trackingNumber: row.trackingNumber, carrier: row.carrier, status: row.status as ShipmentStatus, createdAt: row.createdAt, updatedAt: row.updatedAt },
        row.id,
      ),
    );
  }

  async save(shipment: Shipment): Promise<void> {
    await this.prisma.shipment.upsert({
      where: { id: shipment.id },
      create: { id: shipment.id, orderId: shipment.orderId, trackingNumber: shipment.trackingNumber, carrier: shipment.carrier, status: shipment.status, createdAt: shipment.createdAt, updatedAt: shipment.updatedAt },
      update: { orderId: shipment.orderId, trackingNumber: shipment.trackingNumber, carrier: shipment.carrier, status: shipment.status, updatedAt: shipment.updatedAt },
    });
  }
}
