import type { Shipment } from './shipment.entity';

export interface ShipmentRepository {
  findById(id: string): Promise<Shipment | null>;
  /**
   * Lista de shipments de una orden (en el MVP es 0 o 1, pero el contrato
   * lo deja extensible · r23 sprint1_cierre).
   */
  findByOrderId(orderId: string): Promise<Shipment[]>;
  save(shipment: Shipment): Promise<void>;
}
