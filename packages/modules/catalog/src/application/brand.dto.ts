import type { Brand } from '../domain/brand.entity';

export interface BrandOutput {
  id: string;
  name: string;
  handle: string;
  logoUrl: string | null;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toBrandOutput(brand: Brand): BrandOutput {
  return {
    id: brand.id,
    name: brand.name,
    handle: brand.handle,
    logoUrl: brand.logoUrl,
    description: brand.description,
    metaTitle: brand.metaTitle,
    metaDescription: brand.metaDescription,
    isActive: brand.isActive,
    createdAt: brand.createdAt.toISOString(),
    updatedAt: brand.updatedAt.toISOString(),
  };
}
