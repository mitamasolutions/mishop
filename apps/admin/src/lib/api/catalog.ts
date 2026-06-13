import { apiFetch } from '../api-client';
import type { BrandOutput, ProductCollectionOutput, SalesChannelOutput, ValueTaxonomyOutput } from './types';

export function listBrands(): Promise<BrandOutput[]> {
  return apiFetch<BrandOutput[]>('/catalog/brands');
}

export function getBrand(id: string): Promise<BrandOutput> {
  return apiFetch<BrandOutput>(`/catalog/brands/${id}`);
}

export interface CreateBrandInput {
  name: string;
  handle?: string;
  logoUrl?: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export function createBrand(input: CreateBrandInput): Promise<BrandOutput> {
  return apiFetch<BrandOutput>('/catalog/brands', { method: 'POST', body: input });
}

export interface UpdateBrandInput {
  name?: string;
  handle?: string;
  logoUrl?: string | null;
  description?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export function updateBrand(id: string, input: UpdateBrandInput): Promise<BrandOutput> {
  return apiFetch<BrandOutput>(`/catalog/brands/${id}`, { method: 'PATCH', body: input });
}

export function setBrandStatus(id: string, isActive: boolean): Promise<BrandOutput> {
  return apiFetch<BrandOutput>(`/catalog/brands/${id}/status`, { method: 'PATCH', body: { isActive } });
}

// ----- Tipos de producto -----

export function listProductTypes(): Promise<ValueTaxonomyOutput[]> {
  return apiFetch<ValueTaxonomyOutput[]>('/catalog/product-types');
}

export function createProductType(value: string): Promise<ValueTaxonomyOutput> {
  return apiFetch<ValueTaxonomyOutput>('/catalog/product-types', { method: 'POST', body: { value } });
}

export function updateProductType(id: string, value: string): Promise<ValueTaxonomyOutput> {
  return apiFetch<ValueTaxonomyOutput>(`/catalog/product-types/${id}`, { method: 'PATCH', body: { value } });
}

export function deleteProductType(id: string): Promise<void> {
  return apiFetch<void>(`/catalog/product-types/${id}`, { method: 'DELETE' });
}

// ----- Etiquetas de producto -----

export function listProductTags(): Promise<ValueTaxonomyOutput[]> {
  return apiFetch<ValueTaxonomyOutput[]>('/catalog/product-tags');
}

export function createProductTag(value: string): Promise<ValueTaxonomyOutput> {
  return apiFetch<ValueTaxonomyOutput>('/catalog/product-tags', { method: 'POST', body: { value } });
}

export function updateProductTag(id: string, value: string): Promise<ValueTaxonomyOutput> {
  return apiFetch<ValueTaxonomyOutput>(`/catalog/product-tags/${id}`, { method: 'PATCH', body: { value } });
}

export function deleteProductTag(id: string): Promise<void> {
  return apiFetch<void>(`/catalog/product-tags/${id}`, { method: 'DELETE' });
}

// ----- Canales de venta -----

export function listSalesChannels(): Promise<SalesChannelOutput[]> {
  return apiFetch<SalesChannelOutput[]>('/catalog/sales-channels');
}

export interface CreateSalesChannelInput {
  name: string;
  description?: string;
}

export function createSalesChannel(input: CreateSalesChannelInput): Promise<SalesChannelOutput> {
  return apiFetch<SalesChannelOutput>('/catalog/sales-channels', { method: 'POST', body: input });
}

export interface UpdateSalesChannelInput {
  name?: string;
  description?: string;
}

export function updateSalesChannel(id: string, input: UpdateSalesChannelInput): Promise<SalesChannelOutput> {
  return apiFetch<SalesChannelOutput>(`/catalog/sales-channels/${id}`, { method: 'PATCH', body: input });
}

export function setSalesChannelStatus(id: string, isActive: boolean): Promise<SalesChannelOutput> {
  return apiFetch<SalesChannelOutput>(`/catalog/sales-channels/${id}/status`, {
    method: 'PATCH',
    body: { isActive },
  });
}

// ----- Colecciones -----

export function listCollections(): Promise<ProductCollectionOutput[]> {
  return apiFetch<ProductCollectionOutput[]>('/catalog/collections');
}

export interface CreateCollectionInput {
  title: string;
  handle?: string;
}

export function createCollection(input: CreateCollectionInput): Promise<ProductCollectionOutput> {
  return apiFetch<ProductCollectionOutput>('/catalog/collections', { method: 'POST', body: input });
}

export interface UpdateCollectionInput {
  title?: string;
  handle?: string;
}

export function updateCollection(id: string, input: UpdateCollectionInput): Promise<ProductCollectionOutput> {
  return apiFetch<ProductCollectionOutput>(`/catalog/collections/${id}`, { method: 'PATCH', body: input });
}
