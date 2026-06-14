import type { Shipment } from './shipment.entity';

export interface ShipmentRepository {
  findById(id: string): Promise<Shipment | null>;
  save(shipment: Shipment): Promise<void>;
}
