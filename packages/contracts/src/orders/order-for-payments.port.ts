/**
 * Vista mínima de una orden que necesita el módulo de pagos para validar
 * autorizaciones, capturas y reembolsos sin acoplarse al modelo interno de
 * `@mitama/orders`. La implementación vive en el módulo dueño (orders).
 */
export interface OrderForPaymentsView {
  id: string;
  storeId: string;
  currencyCode: string;
  total: number;
  /** Suma de pagos en estado `paid` ya registrados (excluye reembolsos). */
  paidAmount: number;
  paymentStatus: string;
  status: string;
}

export interface OrderForPaymentsPort {
  findById(orderId: string): Promise<OrderForPaymentsView | null>;
}

/** Token de inyección para el puerto `OrderForPaymentsPort`. */
export const ORDER_FOR_PAYMENTS_PORT = 'mitama.order-for-payments-port';
