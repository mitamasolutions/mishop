/**
 * Estados canónicos de un pago. Se vive en `@mitama/contracts` porque tanto el
 * agregado `Payment` (en `payments`) como cualquier plugin que devuelva
 * resultados de autorización/captura/webhook necesitan el mismo tipo.
 */
export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'paid'
  | 'partially_refunded'
  | 'refunded'
  | 'failed'
  | 'voided'
  | 'cancelled';
