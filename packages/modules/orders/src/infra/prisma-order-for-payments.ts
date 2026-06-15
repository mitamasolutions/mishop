import { Injectable } from '@nestjs/common';
import type { OrderForPaymentsPort, OrderForPaymentsView } from '@mitama/contracts';
import { PrismaService } from '@mitama/db';

/**
 * Adapter del puerto público `OrderForPaymentsPort`: expone una vista
 * mínima de la orden para el módulo `payments` sin acoplarlo al modelo
 * interno de `@mitama/orders`.
 */
@Injectable()
export class PrismaOrderForPayments implements OrderForPaymentsPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(orderId: string): Promise<OrderForPaymentsView | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        storeId: true,
        currencyCode: true,
        total: true,
        status: true,
        paymentStatus: true,
        payments: { select: { amount: true, status: true } },
      },
    });
    if (!order) return null;
    const paidAmount = order.payments
      .filter((payment) => payment.status === 'paid')
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    return {
      id: order.id,
      storeId: order.storeId,
      currencyCode: order.currencyCode,
      total: Number(order.total),
      paidAmount,
      paymentStatus: order.paymentStatus,
      status: order.status,
    };
  }
}
