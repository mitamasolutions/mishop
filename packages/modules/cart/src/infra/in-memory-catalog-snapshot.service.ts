import type { CatalogSnapshotService, VariantSnapshot } from '../domain/catalog-snapshot';

export class InMemoryCatalogSnapshotService implements CatalogSnapshotService {
  readonly variants = new Map<string, VariantSnapshot>();

  async getVariant(input: { variantId: string }): Promise<VariantSnapshot | null> {
    return this.variants.get(input.variantId) ?? null;
  }
}
