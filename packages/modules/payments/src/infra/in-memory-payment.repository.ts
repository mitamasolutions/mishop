import { Injectable } from '@nestjs/common';
import type { Payment } from '../domain/payment.entity';
import type { PaymentRepository } from '../domain/payment.repository';

@Injectable()
export class InMemoryPaymentRepository implements PaymentRepository {
  private readonly payments = new Map<string, Payment>();

  async findById(id: string): Promise<Payment | null> {
    return this.payments.get(id) ?? null;
  }

  async findByOrderId(orderId: string): Promise<Payment[]> {
    return [...this.payments.values()].filter((payment) => payment.orderId === orderId);
  }

  async findByProviderReference(storeId: string, providerCode: string, providerReference: string): Promise<Payment | null> {
    return (
      [...this.payments.values()].find(
        (p) => p.storeId === storeId && p.providerCode === providerCode && p.providerReference === providerReference,
      ) ?? null
    );
  }

  async findByProviderReferenceAnyStore(providerCode: string, providerReference: string): Promise<Payment | null> {
    return (
      [...this.payments.values()].find(
        (p) => p.providerCode === providerCode && p.providerReference === providerReference,
      ) ?? null
    );
  }

  async save(payment: Payment): Promise<void> {
    this.payments.set(payment.id, payment);
  }
}
