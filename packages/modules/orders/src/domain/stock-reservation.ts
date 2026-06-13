import type { CheckoutCartLineSnapshot } from './checkout-cart';

export interface StockReservationInput {
  orderId: string;
  expiresAt: Date;
  lines: CheckoutCartLineSnapshot[];
}

export interface StockReservationService {
  reserve(input: StockReservationInput): Promise<boolean>;
  release(orderId: string): Promise<void>;
  releaseExpired(now: Date): Promise<string[]>;
}
