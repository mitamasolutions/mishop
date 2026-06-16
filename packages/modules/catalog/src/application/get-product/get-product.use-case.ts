import { err, ok, Result, UseCase } from '@mitama/core';
import { ProductNotFoundError } from '../../domain/errors';
import type { ProductReader } from '../../domain/product.repository';
import { toProductOutput, type ProductOutput } from '../product.dto';

export class GetProductUseCase implements UseCase<string, Result<ProductOutput, ProductNotFoundError>> {
  constructor(private readonly products: ProductReader) {}

  async execute(id: string): Promise<Result<ProductOutput, ProductNotFoundError>> {
    const product = await this.products.findById(id);
    if (!product) {
      return err(new ProductNotFoundError(id));
    }
    return ok(toProductOutput(product));
  }
}
