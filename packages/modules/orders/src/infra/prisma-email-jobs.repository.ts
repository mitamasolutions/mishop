import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/db';
import type { EmailJobFailure, EmailJobRecord, EmailJobsRepository } from '../domain/email-jobs.repository';

@Injectable()
export class PrismaEmailJobsRepository implements EmailJobsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findDue(now: Date, limit: number): Promise<EmailJobRecord[]> {
    const rows = await this.prisma.orderEmailJob.findMany({
      where: { status: 'queued', nextRunAt: { lte: now } },
      orderBy: { nextRunAt: 'asc' },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      orderId: row.orderId,
      templateCode: row.templateCode,
      payload: row.payload as Record<string, unknown>,
      attempts: row.attempts,
      maxAttempts: row.maxAttempts,
    }));
  }

  async claim(id: string): Promise<boolean> {
    const result = await this.prisma.orderEmailJob.updateMany({
      where: { id, status: 'queued' },
      data: { attempts: { increment: 1 } },
    });
    return result.count === 1;
  }

  async markProcessed(id: string): Promise<void> {
    await this.prisma.orderEmailJob.update({
      where: { id },
      data: { status: 'processed', lastError: null, updatedAt: new Date() },
    });
  }

  async markFailure(failure: EmailJobFailure): Promise<void> {
    const finalStatus = failure.attempts >= failure.maxAttempts ? 'failed' : 'queued';
    await this.prisma.orderEmailJob.update({
      where: { id: failure.id },
      data: {
        status: finalStatus,
        lastError: failure.error.slice(0, 1000),
        nextRunAt: finalStatus === 'queued' ? failure.nextRunAt : undefined,
        updatedAt: new Date(),
      },
    });
  }
}
