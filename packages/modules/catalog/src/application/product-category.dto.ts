import type { ProductCategory } from '../domain/product-category.entity';

export interface ProductCategoryOutput {
  id: string;
  name: string;
  description: string | null;
  handle: string;
  mpath: string;
  isActive: boolean;
  isInternal: boolean;
  rank: number;
  parentCategoryId: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toProductCategoryOutput(category: ProductCategory): ProductCategoryOutput {
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    handle: category.handle,
    mpath: category.mpath,
    isActive: category.isActive,
    isInternal: category.isInternal,
    rank: category.rank,
    parentCategoryId: category.parentCategoryId,
    metaTitle: category.metaTitle,
    metaDescription: category.metaDescription,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}
