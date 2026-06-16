import { ok, type Result, type UseCase } from '@mitama/core';
import type { PaymentReader } from '../domain/payment.repository';
import { toPaymentOutput, type PaymentOutput } from './payment.dto';

/** Lista pagos por orden para el tab de Pagos en admin. */
export class ListPaymentsByOrderUseCase implements UseCase<string, Result<PaymentOutput[], never>> {
  constructor(private readonly payments: PaymentReader) {}

  async execute(orderId: string): Promise<Result<PaymentOutput[], never>> {
    const items = await this.payments.findByOrderId(orderId);
    return ok(items.map(toPaymentOutput));
  }
}
