import { Entity } from '@mitama/core';
import { InvalidShipmentTransitionError } from './errors';

export type ShipmentStatus = 'pending' | 'shipped' | 'in_transit' | 'delivered' | 'cancelled';

interface ShipmentProps {
  orderId: string;
  trackingNumber: string | null;
  carrier: string | null;
  status: ShipmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  pending: ['shipped', 'cancelled'],
  shipped: ['in_transit', 'delivered', 'cancelled'],
  in_transit: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export class Shipment extends Entity<ShipmentProps> {
  static create(input: { orderId: string; trackingNumber?: string | null; carrier?: string | null }): Shipment {
    const now = new Date();
    return new Shipment(crypto.randomUUID(), { orderId: input.orderId, trackingNumber: input.trackingNumber ?? null, carrier: input.carrier ?? null, status: 'pending', createdAt: now, updatedAt: now });
  }

  static rehydrate(props: ShipmentProps, id: string): Shipment {
    return new Shipment(id, props);
  }

  get orderId(): string { return this.props.orderId; }
  get trackingNumber(): string | null { return this.props.trackingNumber; }
  get carrier(): string | null { return this.props.carrier; }
  get status(): ShipmentStatus { return this.props.status; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  updateTracking(input: { trackingNumber?: string | null; carrier?: string | null }): void {
    if (input.trackingNumber !== undefined) this.props.trackingNumber = input.trackingNumber;
    if (input.carrier !== undefined) this.props.carrier = input.carrier;
    this.props.updatedAt = new Date();
  }

  transition(to: ShipmentStatus): void {
    if (to === this.props.status) return;
    if (!SHIPMENT_TRANSITIONS[this.props.status].includes(to)) throw new InvalidShipmentTransitionError(this.props.status, to);
    this.props.status = to;
    this.props.updatedAt = new Date();
  }
}
