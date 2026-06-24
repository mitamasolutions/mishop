import type { CheckoutCartLineSnapshot } from './checkout-cart';

export interface StockReservationInput {
  orderId: string;
  expiresAt: Date;
  lines: CheckoutCartLineSnapshot[];
}

export interface StockReservationService {
  reserve(input: StockReservationInput): Promise<boolean>;
  release(orderId: string): Promise<void>;
  /**
   * Confirma el consumo definitivo: decrementa `stockedQuantity` y
   * `reservedQuantity` en la misma cantidad y marca las reservas como
   * liberadas. Idempotente: si no quedan reservas activas, no hace nada.
   */
  consume(orderId: string): Promise<void>;
  releaseExpired(now: Date): Promise<string[]>;
}
