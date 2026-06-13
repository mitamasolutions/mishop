import { ok, Result, UseCase } from '@mitama/core';
import type { ProductRepository } from '../../domain/product.repository';
import type { ListProductsInput, ListProductsOutput } from './list-products.dto';

export class ListProductsUseCase implements UseCase<ListProductsInput, Result<ListProductsOutput, never>> {
  constructor(private readonly products: ProductRepository) {}

  async execute(input: ListProductsInput): Promise<Result<ListProductsOutput, never>> {
    const page = await this.products.findAll(input);
    return ok({
      items: page.items.map((product) => {
        const variants = product.variants;
        return {
          id: product.id,
          title: product.title,
          handle: product.handle,
          status: product.status,
          thumbnail: product.thumbnail,
          brandId: product.brandId,
          typeId: product.typeId,
          variantCount: variants.length,
          defaultSku: variants[0]?.sku ?? null,
          updatedAt: product.updatedAt.toISOString(),
        };
      }),
      total: page.total,
      page: page.page,
      pageSize: page.pageSize,
    });
  }
}
