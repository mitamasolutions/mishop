import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/data';
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
    await this.applyToActiveReservations(orderId, async (tx, reservation) => {
      const link = await tx.productVariantInventoryItem.findUnique({ where: { variantId: reservation.variantId } });
      if (!link) return;
      await tx.inventoryLevel.updateMany({
        where: { inventoryItemId: link.inventoryItemId, locationId: reservation.stockLocationId },
        data: { reservedQuantity: { decrement: reservation.quantity }, version: { increment: 1 } },
      });
    });
  }

  async consume(orderId: string): Promise<void> {
    await this.applyToActiveReservations(orderId, async (tx, reservation) => {
      const link = await tx.productVariantInventoryItem.findUnique({ where: { variantId: reservation.variantId } });
      if (!link) return;
      await tx.inventoryLevel.updateMany({
        where: { inventoryItemId: link.inventoryItemId, locationId: reservation.stockLocationId },
        data: {
          stockedQuantity: { decrement: reservation.quantity },
          reservedQuantity: { decrement: reservation.quantity },
          version: { increment: 1 },
        },
      });
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

  /**
   * Reclama cada reserva activa con `UPDATE ... WHERE releasedAt IS NULL`
   * (claim-then-apply): solo el ganador del claim ejecuta el efecto
   * sobre `inventory_levels`. Evita dobles decrementos ante carreras
   * entre `release` y `consume` o llamadas concurrentes a la misma op.
   */
  private async applyToActiveReservations(
    orderId: string,
    apply: (
      tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
      reservation: { id: string; variantId: string; stockLocationId: string; quantity: number },
    ) => Promise<void>,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const reservations = await tx.stockReservation.findMany({ where: { orderId, releasedAt: null } });
      for (const reservation of reservations) {
        const claimed = await tx.stockReservation.updateMany({
          where: { id: reservation.id, releasedAt: null },
          data: { releasedAt: new Date() },
        });
        if (claimed.count !== 1) continue;
        await apply(tx, {
          id: reservation.id,
          variantId: reservation.variantId,
          stockLocationId: reservation.stockLocationId,
          quantity: Number(reservation.quantity),
        });
      }
    });
  }
}
