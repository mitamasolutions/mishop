import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@mitama/db';
import type { EmailQueue } from '../domain/email-queue';

@Injectable()
export class PrismaEmailQueue implements EmailQueue {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(input: { orderId: string; templateCode: string; payload: Record<string, unknown> }): Promise<void> {
    const template = await this.prisma.orderEmailTemplate.findFirst({
      where: { code: input.templateCode, isActive: true },
      orderBy: { version: 'desc' },
    });
    await this.prisma.orderEmailJob.create({
      data: {
        orderId: input.orderId,
        templateId: template?.id ?? null,
        templateCode: input.templateCode,
        payload: input.payload as Prisma.InputJsonValue,
        maxAttempts: 3,
      },
    });
  }
}
