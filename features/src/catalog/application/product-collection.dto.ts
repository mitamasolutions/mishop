import type { ProductCollection } from '../domain/product-collection.entity';

export interface ProductCollectionOutput {
  id: string;
  title: string;
  handle: string;
  createdAt: string;
  updatedAt: string;
}

export function toProductCollectionOutput(collection: ProductCollection): ProductCollectionOutput {
  return {
    id: collection.id,
    title: collection.title,
    handle: collection.handle,
    createdAt: collection.createdAt.toISOString(),
    updatedAt: collection.updatedAt.toISOString(),
  };
}
