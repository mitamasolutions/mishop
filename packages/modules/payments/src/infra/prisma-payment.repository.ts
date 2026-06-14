import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@mitama/db';
import { Payment, type PaymentRefundProps, type PaymentStatus, type PaymentTransitionProps } from '../domain/payment.entity';
import type { PaymentRepository } from '../domain/payment.repository';

const PAYMENT_INCLUDE = { transitions: true, refunds: true } satisfies Prisma.PaymentInclude;
type PaymentRow = Prisma.PaymentGetPayload<{ include: typeof PAYMENT_INCLUDE }>;

@Injectable()
export class PrismaPaymentRepository implements PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Payment | null> {
    const row = await this.prisma.payment.findUnique({ where: { id }, include: PAYMENT_INCLUDE });
    return row ? this.toDomain(row) : null;
  }

  async findByOrderId(orderId: string): Promise<Payment[]> {
    const rows = await this.prisma.payment.findMany({ where: { orderId }, include: PAYMENT_INCLUDE, orderBy: { createdAt: 'desc' } });
    return rows.map((row) => this.toDomain(row));
  }

  async save(payment: Payment): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.upsert({ where: { id: payment.id }, create: this.toPaymentRow(payment), update: this.toPaymentRow(payment) });
      await tx.paymentTransition.deleteMany({ where: { paymentId: payment.id } });
      await tx.paymentRefund.deleteMany({ where: { paymentId: payment.id } });
      if (payment.transitions.length > 0) await tx.paymentTransition.createMany({ data: payment.transitions.map((transition) => ({ paymentId: payment.id, ...transition })) });
      if (payment.refunds.length > 0) await tx.paymentRefund.createMany({ data: payment.refunds.map((refund) => ({ paymentId: payment.id, ...refund })) });
    });
  }

  private toPaymentRow(payment: Payment): Prisma.PaymentUncheckedCreateInput {
    return {
      id: payment.id,
      storeId: payment.storeId,
      orderId: payment.orderId,
      providerCode: payment.providerCode,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      providerReference: payment.providerReference,
      lastProviderEventAt: payment.lastProviderEventAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  private toDomain(row: PaymentRow): Payment {
    return Payment.rehydrate(
      {
        storeId: row.storeId,
        orderId: row.orderId,
        providerCode: row.providerCode,
        amount: Number(row.amount),
        currency: row.currency,
        status: row.status as PaymentStatus,
        providerReference: row.providerReference,
        lastProviderEventAt: row.lastProviderEventAt,
        transitions: row.transitions.map((transition): PaymentTransitionProps => ({ id: transition.id, from: transition.from as PaymentStatus, to: transition.to as PaymentStatus, reason: transition.reason, createdAt: transition.createdAt })),
        refunds: row.refunds.map((refund): PaymentRefundProps => ({ id: refund.id, amount: Number(refund.amount), status: refund.status as PaymentRefundProps['status'], providerReference: refund.providerReference, createdAt: refund.createdAt, updatedAt: refund.updatedAt })),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      row.id,
    );
  }
}
