import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@mitama/db';
import type { PaymentWebhookEventProps, PaymentWebhookEventStatus } from '../domain/payment-webhook-event.entity';
import type { PaymentWebhookEventRepository } from '../domain/payment-webhook-event.repository';

@Injectable()
export class PrismaPaymentWebhookEventRepository implements PaymentWebhookEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async claim(event: PaymentWebhookEventProps): Promise<boolean> {
    try {
      await this.prisma.paymentWebhookEvent.create({ data: event });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return false;
      throw error;
    }
  }

  async findByProviderAndEventId(providerCode: string, eventId: string): Promise<PaymentWebhookEventProps | null> {
    const row = await this.prisma.paymentWebhookEvent.findUnique({ where: { providerCode_eventId: { providerCode, eventId } } });
    return row ? { ...row, status: row.status as PaymentWebhookEventStatus } : null;
  }

  async save(event: PaymentWebhookEventProps): Promise<void> {
    await this.prisma.paymentWebhookEvent.upsert({
      where: { providerCode_eventId: { providerCode: event.providerCode, eventId: event.eventId } },
      create: event,
      update: event,
    });
  }
}
