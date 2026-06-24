import { ok, Result, UseCase } from '@mitama/core';
import type { StockLocationRepository } from '../../domain/stock-location.repository';
import { toStockLocationOutput, type StockLocationOutput } from '../stock-location.dto';

export class ListStockLocationsUseCase implements UseCase<void, Result<StockLocationOutput[], never>> {
  constructor(private readonly locations: StockLocationRepository) {}

  async execute(): Promise<Result<StockLocationOutput[], never>> {
    const locations = await this.locations.findAll();
    return ok(locations.map(toStockLocationOutput));
  }
}
