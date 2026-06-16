export interface VariantSnapshot {
  variantId: string;
  productId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  currencyCode: string;
  unitPrice: number;
  availableStock: number;
  locationId: string;
}

export interface CatalogSnapshotService {
  getVariant(input: { storeId: string; channel: string; variantId: string; quantity: number }): Promise<VariantSnapshot | null>;
}
