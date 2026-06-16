import type { RecordActivityInput } from '../../activity-log';
import { Product } from './product.entity';
import type { SlugRedirect } from './brand.repository';

export interface ProductFilter {
  search?: string;
  status?: string;
  categoryId?: string;
  collectionId?: string;
  salesChannelId?: string;
  page?: number;
  pageSize?: number;
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Puerto de persistencia de productos. infra/ lo implementa con Prisma,
 * escribiendo la mutación, el `recordActivity` y (si aplica) el redirect 301
 * en la misma transacción. Persiste también opciones, variantes y
 * especificaciones como parte del aggregate.
 */
export interface ProductReader {
  findById(id: string): Promise<Product | null>;
  findByHandle(handle: string): Promise<Product | null>;
  findAll(filter: ProductFilter): Promise<ProductPage>;
  /** Busca una variante por SKU en cualquier producto (unicidad global). */
  findVariantBySku(sku: string): Promise<{ productId: string; variantId: string } | null>;
  /** Busca una variante por id en cualquier producto. */
  findVariantById(variantId: string): Promise<{ productId: string; variantId: string } | null>;
}

export interface ProductWriter {
  create(product: Product, activity: RecordActivityInput): Promise<void>;
  update(product: Product, activity: RecordActivityInput, redirect: SlugRedirect | null): Promise<void>;
  /** Baja lógica (`deletedAt`). */
  remove(product: Product, activity: RecordActivityInput): Promise<void>;
}
