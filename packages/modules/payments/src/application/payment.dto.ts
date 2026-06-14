import type { Payment, PaymentRefundProps, PaymentTransitionProps } from '../domain/payment.entity';

export interface PaymentOutput {
  id: string;
  storeId: string;
  orderId: string;
  providerCode: string;
  amount: number;
  currency: string;
  status: string;
  providerReference: string | null;
  refundableAmount: number;
  transitions: Array<Omit<PaymentTransitionProps, 'createdAt'> & { createdAt: string }>;
  refunds: Array<Omit<PaymentRefundProps, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string }>;
  createdAt: string;
  updatedAt: string;
}

export function toPaymentOutput(payment: Payment): PaymentOutput {
  return {
    id: payment.id,
    storeId: payment.storeId,
    orderId: payment.orderId,
    providerCode: payment.providerCode,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    providerReference: payment.providerReference,
    refundableAmount: payment.refundableAmount,
    transitions: payment.transitions.map((transition) => ({ ...transition, createdAt: transition.createdAt.toISOString() })),
    refunds: payment.refunds.map((refund) => ({ ...refund, createdAt: refund.createdAt.toISOString(), updatedAt: refund.updatedAt.toISOString() })),
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}
