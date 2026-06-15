/** Tokens de inyección internos del módulo: puertos → adapters. */
export const ORDERS_TOKENS = {
  orderRepository: 'orders.order-repository',
  checkoutCartReader: 'orders.checkout-cart-reader',
  stockReservationService: 'orders.stock-reservation-service',
  emailQueue: 'orders.email-queue',
  outboxDispatcher: 'orders.outbox-dispatcher',
} as const;
