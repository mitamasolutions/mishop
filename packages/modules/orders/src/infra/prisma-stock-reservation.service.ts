import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/db';
import type { StockReservationInput, StockReservationService } from '../domain/stock-reservation';

@Injectable()
export class PrismaStockReservationService implements StockReservationService {
  constructor(private readonly prisma: PrismaService) {}

  async reserve(input: StockReservationInput): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const line of input.lines) {
          const link = await tx.productVariantInventoryItem.findUnique({ where: { variantId: line.variantId } });
          if (!link) throw new Error('stock');
          const level = await tx.inventoryLevel.findUnique({
            where: { inventoryItemId_locationId: { inventoryItemId: link.inventoryItemId, locationId: line.stockLocationId } },
          });
          if (!level || Number(level.stockedQuantity) - Number(level.reservedQuantity) < line.quantity) throw new Error('stock');
          const updated = await tx.inventoryLevel.updateMany({
            where: {
              id: level.id,
              version: level.version,
            },
            data: { reservedQuantity: { increment: line.quantity }, version: { increment: 1 } },
          });
          if (updated.count !== 1) throw new Error('stock');
          await tx.stockReservation.create({
            data: { orderId: input.orderId, variantId: line.variantId, stockLocationId: line.stockLocationId, quantity: line.quantity, expiresAt: input.expiresAt },
          });
        }
      });
      return true;
    } catch {
      return false;
    }
  }

  async release(orderId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const reservations = await tx.stockReservation.findMany({ where: { orderId, releasedAt: null } });
      for (const reservation of reservations) {
        const link = await tx.productVariantInventoryItem.findUnique({ where: { variantId: reservation.variantId } });
        if (link) {
          await tx.inventoryLevel.updateMany({
            where: { inventoryItemId: link.inventoryItemId, locationId: reservation.stockLocationId },
            data: { reservedQuantity: { decrement: reservation.quantity }, version: { increment: 1 } },
          });
        }
      }
      await tx.stockReservation.updateMany({ where: { orderId, releasedAt: null }, data: { releasedAt: new Date() } });
    });
  }

  async releaseExpired(now: Date): Promise<string[]> {
    const rows = await this.prisma.stockReservation.findMany({
      where: { expiresAt: { lte: now }, releasedAt: null },
      select: { orderId: true },
      distinct: ['orderId'],
    });
    for (const row of rows) await this.release(row.orderId);
    return rows.map((row) => row.orderId);
  }
}
