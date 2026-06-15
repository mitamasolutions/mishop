import { apiFetch } from '../api-client';

export type ShipmentStatus = 'pending' | 'shipped' | 'in_transit' | 'delivered' | 'cancelled';

export interface ShipmentOutput {
  id: string;
  orderId: string;
  trackingNumber: string | null;
  carrier: string | null;
  status: ShipmentStatus;
  createdAt: string;
  updatedAt: string;
}

export function listShipmentsByOrder(orderId: string): Promise<ShipmentOutput[]> {
  return apiFetch<ShipmentOutput[]>(`/shipping/by-order/${orderId}`);
}

export function createShipment(input: { orderId: string; trackingNumber?: string | null; carrier?: string | null }): Promise<ShipmentOutput> {
  return apiFetch<ShipmentOutput>('/shipping/shipments', { method: 'POST', body: input });
}

export function updateShipmentStatus(shipmentId: string, input: { status: ShipmentStatus; trackingNumber?: string | null; carrier?: string | null }): Promise<ShipmentOutput> {
  return apiFetch<ShipmentOutput>(`/shipping/shipments/${shipmentId}/status`, { method: 'POST', body: input });
}
