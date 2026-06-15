import type { Payment } from './payment.entity';

export interface PaymentRepository {
  findById(id: string): Promise<Payment | null>;
  findByOrderId(orderId: string): Promise<Payment[]>;
  /**
   * Busca un pago por la referencia que el proveedor le asignó. Lo usa el
   * webhook (r14 · sprint1_cierre) cuando el evento llega con el id del
   * proveedor (ej. MP) en vez del id local.
   */
  findByProviderReference(storeId: string, providerCode: string, providerReference: string): Promise<Payment | null>;
  save(payment: Payment): Promise<void>;
}
