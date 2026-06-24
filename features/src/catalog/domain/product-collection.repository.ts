import type { RecordActivityInput } from '../../activity-log';
import type { ProductCollection } from './product-collection.entity';
import type { SlugRedirect } from './brand.repository';

export interface ProductCollectionRepository {
  findById(id: string): Promise<ProductCollection | null>;
  findByHandle(handle: string): Promise<ProductCollection | null>;
  findAll(): Promise<ProductCollection[]>;
  create(collection: ProductCollection, activity: RecordActivityInput): Promise<void>;
  update(collection: ProductCollection, activity: RecordActivityInput, redirect: SlugRedirect | null): Promise<void>;
}
