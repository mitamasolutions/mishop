import type { Payment } from './payment.entity';

export interface PaymentRepository {
  findById(id: string): Promise<Payment | null>;
  findByOrderId(orderId: string): Promise<Payment[]>;
  save(payment: Payment): Promise<void>;
}
