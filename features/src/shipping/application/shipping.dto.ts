import type { Shipment } from '../domain/shipment.entity';

export interface ShipmentOutput {
  id: string;
  orderId: string;
  trackingNumber: string | null;
  carrier: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function toShipmentOutput(shipment: Shipment): ShipmentOutput {
  return {
    id: shipment.id,
    orderId: shipment.orderId,
    trackingNumber: shipment.trackingNumber,
    carrier: shipment.carrier,
    status: shipment.status,
    createdAt: shipment.createdAt.toISOString(),
    updatedAt: shipment.updatedAt.toISOString(),
  };
}
