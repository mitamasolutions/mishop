import { ok, type Result, type UseCase } from '@mitama/core';
import type { StockReservationService } from '../domain/stock-reservation';

export class ReleaseExpiredReservationsUseCase implements UseCase<Date | undefined, Result<string[], never>> {
  constructor(private readonly stockReservations: StockReservationService) {}

  async execute(now = new Date()): Promise<Result<string[], never>> {
    return ok(await this.stockReservations.releaseExpired(now));
  }
}
