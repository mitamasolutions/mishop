import type { Payment } from './payment.entity';

export interface PaymentReader {
  findById(id: string): Promise<Payment | null>;
  findByOrderId(orderId: string): Promise<Payment[]>;
}

export interface PaymentReferenceReader {
  findByProviderReference(storeId: string, providerCode: string, providerReference: string): Promise<Payment | null>;
  findByProviderReferenceAnyStore(providerCode: string, providerReference: string): Promise<Payment | null>;
}

export interface PaymentWriter {
  save(payment: Payment): Promise<void>;
}
