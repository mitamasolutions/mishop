import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@mitama/db';
import { EVENT_BUS } from '@mitama/contracts';
import type { EventBus } from '@mitama/core';
import { type OutboxDispatcher, type PendingOutboxEvent, toDomainEvent } from '../domain/outbox';

const DEFAULT_BATCH = 50;

@Injectable()
export class PrismaOutboxDispatcher implements OutboxDispatcher {
  private readonly logger = new Logger(PrismaOutboxDispatcher.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async dispatchPending(limit = DEFAULT_BATCH): Promise<{ dispatched: string[]; failed: string[] }> {
    const pending = await this.prisma.outboxEvent.findMany({
      where: { dispatchedAt: null },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    const dispatched: string[] = [];
    const failed: string[] = [];

    for (const row of pending) {
      if (row.attempts >= row.maxAttempts) {
        failed.push(row.id);
        continue;
      }
      // Claim atómico: solo el ganador del UPDATE publica el evento.
      const claim = await this.prisma.outboxEvent.updateMany({
        where: { id: row.id, dispatchedAt: null },
        data: { attempts: { increment: 1 } },
      });
      if (claim.count !== 1) continue;

      const event: PendingOutboxEvent = {
        id: row.id,
        name: row.eventName,
        payload: row.payload as Record<string, unknown>,
        storeId: row.storeId,
        attempts: row.attempts + 1,
        maxAttempts: row.maxAttempts,
      };
      try {
        await this.eventBus.publish(toDomainEvent(event));
        await this.prisma.outboxEvent.update({
          where: { id: row.id },
          data: { dispatchedAt: new Date(), lastError: null },
        });
        dispatched.push(row.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Falló despacho de outbox ${row.id} (${row.eventName}): ${message}`);
        await this.prisma.outboxEvent.update({
          where: { id: row.id },
          data: { lastError: message.slice(0, 1000) },
        });
        failed.push(row.id);
      }
    }

    return { dispatched, failed };
  }
}
