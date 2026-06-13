import { ok, Result, UseCase } from '@mitama/core';
import type { BrandRepository } from '../../domain/brand.repository';
import { toBrandOutput, type BrandOutput } from '../brand.dto';

export class ListBrandsUseCase implements UseCase<void, Result<BrandOutput[], never>> {
  constructor(private readonly brands: BrandRepository) {}

  async execute(): Promise<Result<BrandOutput[], never>> {
    const brands = await this.brands.findAll();
    return ok(brands.map(toBrandOutput));
  }
}
