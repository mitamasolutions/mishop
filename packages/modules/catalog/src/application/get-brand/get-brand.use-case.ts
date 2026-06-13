import { err, ok, Result, UseCase } from '@mitama/core';
import { BrandNotFoundError } from '../../domain/errors';
import type { BrandRepository } from '../../domain/brand.repository';
import { toBrandOutput, type BrandOutput } from '../brand.dto';

export class GetBrandUseCase implements UseCase<string, Result<BrandOutput, BrandNotFoundError>> {
  constructor(private readonly brands: BrandRepository) {}

  async execute(id: string): Promise<Result<BrandOutput, BrandNotFoundError>> {
    const brand = await this.brands.findById(id);
    if (!brand) {
      return err(new BrandNotFoundError(id));
    }
    return ok(toBrandOutput(brand));
  }
}
