import { Injectable, Logger } from '@nestjs/common';
import type { EmailQueue } from '../domain/email-queue';

@Injectable()
export class LogEmailQueue implements EmailQueue {
  private readonly logger = new Logger(LogEmailQueue.name);

  async enqueue(input: { orderId: string; templateCode: string; payload: Record<string, unknown> }): Promise<void> {
    this.logger.log(`Email encolado ${input.templateCode} para orden ${input.orderId}`);
  }
}
