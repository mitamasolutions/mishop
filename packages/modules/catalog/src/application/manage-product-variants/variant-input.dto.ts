/** Campos capturables de una variante (compartidos entre alta y edición). */
export interface VariantFieldsInput {
  title?: string;
  sku?: string;
  barcode?: string | null;
  ean?: string | null;
  upc?: string | null;
  allowBackorder?: boolean;
  manageInventory?: boolean;
  lowStockThreshold?: number | null;
  cost?: number | null;
  salePrice?: number | null;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  weight?: number | null;
  length?: number | null;
  height?: number | null;
  width?: number | null;
  variantRank?: number;
  metadata?: Record<string, unknown> | null;
}
