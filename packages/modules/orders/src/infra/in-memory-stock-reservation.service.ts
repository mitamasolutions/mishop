import type { StockReservationInput, StockReservationService } from '../domain/stock-reservation';

interface ReservationLine {
  key: string;
  quantity: number;
}

export class InMemoryStockReservationService implements StockReservationService {
  /** Stock disponible (stocked - reserved) por `locationId:variantId`. */
  readonly available = new Map<string, number>();
  /** Stock consumido acumulado (decremento definitivo de stocked). */
  readonly consumed = new Map<string, number>();
  private readonly reservations = new Map<string, { expiresAt: Date; lines: ReservationLine[] }>();

  async reserve(input: StockReservationInput): Promise<boolean> {
    const required = input.lines.map((line) => ({ key: `${line.stockLocationId}:${line.variantId}`, quantity: line.quantity }));
    if (required.some((line) => (this.available.get(line.key) ?? 0) < line.quantity)) return false;
    for (const line of required) this.available.set(line.key, (this.available.get(line.key) ?? 0) - line.quantity);
    this.reservations.set(input.orderId, { expiresAt: input.expiresAt, lines: required });
    return true;
  }

  async release(orderId: string): Promise<void> {
    const reservation = this.reservations.get(orderId);
    if (!reservation) return;
    for (const line of reservation.lines) this.available.set(line.key, (this.available.get(line.key) ?? 0) + line.quantity);
    this.reservations.delete(orderId);
  }

  async consume(orderId: string): Promise<void> {
    const reservation = this.reservations.get(orderId);
    if (!reservation) return;
    for (const line of reservation.lines) {
      this.consumed.set(line.key, (this.consumed.get(line.key) ?? 0) + line.quantity);
    }
    this.reservations.delete(orderId);
  }

  async releaseExpired(now: Date): Promise<string[]> {
    const released: string[] = [];
    for (const [orderId, reservation] of this.reservations) {
      if (reservation.expiresAt <= now) {
        await this.release(orderId);
        released.push(orderId);
      }
    }
    return released;
  }
}
