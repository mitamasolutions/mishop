import { Entity } from '@mitama/core';
import type { PaymentStatus } from '@mitama/contracts';
import { InvalidPaymentTransitionError, PaymentNotRefundableError, RefundAmountExceededError } from './errors';

export type { PaymentStatus };

export interface PaymentTransitionProps {
  id: string;
  from: PaymentStatus;
  to: PaymentStatus;
  reason: string | null;
  createdAt: Date;
}

export interface PaymentRefundProps {
  id: string;
  amount: number;
  status: 'pending' | 'succeeded' | 'failed';
  providerReference: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PaymentProps {
  storeId: string;
  orderId: string;
  providerCode: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  providerReference: string | null;
  lastProviderEventAt: Date | null;
  transitions: PaymentTransitionProps[];
  refunds: PaymentRefundProps[];
  createdAt: Date;
  updatedAt: Date;
}

const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ['authorized', 'paid', 'failed', 'cancelled'],
  authorized: ['paid', 'failed', 'voided', 'cancelled'],
  paid: ['partially_refunded', 'refunded', 'failed'],
  partially_refunded: ['partially_refunded', 'refunded'],
  refunded: [],
  failed: [],
  voided: [],
  cancelled: [],
};

const STATUS_RANK: Record<PaymentStatus, number> = {
  pending: 0,
  authorized: 1,
  failed: 1,
  cancelled: 1,
  voided: 2,
  paid: 3,
  partially_refunded: 4,
  refunded: 5,
};

export class Payment extends Entity<PaymentProps> {
  static create(input: { storeId: string; orderId: string; providerCode: string; amount: number; currency: string }): Payment {
    const now = new Date();
    return new Payment(crypto.randomUUID(), {
      ...input,
      status: 'pending',
      providerReference: null,
      lastProviderEventAt: null,
      transitions: [],
      refunds: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: PaymentProps, id: string): Payment {
    return new Payment(id, props);
  }

  get storeId(): string { return this.props.storeId; }
  get orderId(): string { return this.props.orderId; }
  get providerCode(): string { return this.props.providerCode; }
  get amount(): number { return this.props.amount; }
  get currency(): string { return this.props.currency; }
  get status(): PaymentStatus { return this.props.status; }
  get providerReference(): string | null { return this.props.providerReference; }
  get lastProviderEventAt(): Date | null { return this.props.lastProviderEventAt; }
  get transitions(): PaymentTransitionProps[] { return this.props.transitions.map((transition) => ({ ...transition })); }
  get refunds(): PaymentRefundProps[] { return this.props.refunds.map((refund) => ({ ...refund })); }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get refundedAmount(): number { return this.props.refunds.filter((refund) => refund.status === 'succeeded').reduce((sum, refund) => sum + refund.amount, 0); }
  get refundableAmount(): number { return Math.max(0, this.props.amount - this.refundedAmount); }

  transition(to: PaymentStatus, reason: string | null, occurredAt = new Date()): boolean {
    if (to === this.props.status) {
      this.props.lastProviderEventAt = maxDate(this.props.lastProviderEventAt, occurredAt);
      return false;
    }
    if (this.isOutOfOrder(to, occurredAt)) return false;
    if (!PAYMENT_TRANSITIONS[this.props.status].includes(to)) throw new InvalidPaymentTransitionError(this.props.status, to);
    this.props.transitions.push({ id: crypto.randomUUID(), from: this.props.status, to, reason, createdAt: new Date() });
    this.props.status = to;
    this.props.lastProviderEventAt = maxDate(this.props.lastProviderEventAt, occurredAt);
    this.props.updatedAt = new Date();
    return true;
  }

  setProviderReference(reference: string | null | undefined): void {
    if (reference) this.props.providerReference = reference;
  }

  requestRefund(amount: number): PaymentRefundProps {
    if (this.props.status !== 'paid' && this.props.status !== 'partially_refunded') throw new PaymentNotRefundableError(this.props.status);
    if (amount <= 0 || amount > this.refundableAmount) throw new RefundAmountExceededError();
    const now = new Date();
    const refund = { id: crypto.randomUUID(), amount, status: 'pending' as const, providerReference: null, createdAt: now, updatedAt: now };
    this.props.refunds.push(refund);
    this.props.updatedAt = now;
    return { ...refund };
  }

  setRefundProviderReference(refundId: string, providerReference: string | null | undefined): void {
    if (!providerReference) return;
    const refund = this.props.refunds.find((item) => item.id === refundId);
    if (!refund) return;
    refund.providerReference = providerReference;
    refund.updatedAt = new Date();
    this.props.updatedAt = new Date();
  }

  markRefundSucceeded(input: { refundId?: string | null; refundReference?: string | null; providerReference?: string | null; amount?: number | null; occurredAt?: Date }): boolean {
    let refund = this.props.refunds.find((item) => input.refundId && item.id === input.refundId)
      ?? this.props.refunds.find((item) => input.refundReference && item.providerReference === input.refundReference)
      ?? this.props.refunds.find((item) => item.status === 'pending');
    if (!refund) {
      if (!input.amount || input.amount <= 0) return false;
      const now = new Date();
      refund = { id: crypto.randomUUID(), amount: input.amount, status: 'succeeded', providerReference: input.refundReference ?? input.providerReference ?? null, createdAt: now, updatedAt: now };
      this.props.refunds.push(refund);
    }
    refund.status = 'succeeded';
    refund.providerReference = input.refundReference ?? input.providerReference ?? refund.providerReference;
    refund.updatedAt = new Date();
    return this.transition(this.refundableAmount === 0 ? 'refunded' : 'partially_refunded', 'Reembolso confirmado', input.occurredAt ?? new Date());
  }

  private isOutOfOrder(to: PaymentStatus, occurredAt: Date): boolean {
    if (!this.props.lastProviderEventAt) return false;
    return occurredAt < this.props.lastProviderEventAt && STATUS_RANK[to] < STATUS_RANK[this.props.status];
  }
}

function maxDate(current: Date | null, next: Date): Date {
  return !current || next > current ? next : current;
}
