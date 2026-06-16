import type { RecordActivityInput } from '@mitama/activity-log';
import { ProductCategory } from './product-category.entity';
import type { SlugRedirect } from './brand.repository';

/**
 * Puerto de persistencia de categorías. infra/ lo implementa con Prisma,
 * escribiendo la mutación, el `recordActivity` y (si aplica) el redirect 301
 * en la misma transacción.
 */
export interface ProductCategoryRepository {
  findById(id: string): Promise<ProductCategory | null>;
  findByHandle(handle: string): Promise<ProductCategory | null>;
  findAll(): Promise<ProductCategory[]>;
  findChildren(parentCategoryId: string | null): Promise<ProductCategory[]>;
  /** Todas las categorías cuyo `mpath` comienza con `category.fullPath`. */
  findDescendants(category: ProductCategory): Promise<ProductCategory[]>;
  create(category: ProductCategory, activity: RecordActivityInput): Promise<void>;
  update(category: ProductCategory, activity: RecordActivityInput, redirect: SlugRedirect | null): Promise<void>;
  /** Persiste el nuevo padre/rango/mpath de `category` y el `mpath` recalculado de sus descendientes. */
  move(category: ProductCategory, descendants: ProductCategory[], activity: RecordActivityInput): Promise<void>;
  /** Elimina `category` reasignando a `reparented` (hijos directos e indirectos) su nuevo padre/mpath. */
  remove(category: ProductCategory, reparented: ProductCategory[], activity: RecordActivityInput): Promise<void>;
}
