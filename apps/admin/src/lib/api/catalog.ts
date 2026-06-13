import { apiFetch } from '../api-client';
import type {
  BrandOutput,
  EffectivePriceOutput,
  ListProductsOutput,
  ListPriceListsOutput,
  PriceListOutput,
  PriceListStatus,
  PriceListType,
  ProductCategoryOutput,
  ProductCollectionOutput,
  ProductOutput,
  ProductStatus,
  SalesChannelOutput,
  ValueTaxonomyOutput,
  VariantCombinationPreview,
} from './types';

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

// ----- Categorías -----

export function listCategories(): Promise<ProductCategoryOutput[]> {
  return apiFetch<ProductCategoryOutput[]>('/catalog/categories');
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  handle?: string;
  parentCategoryId?: string;
  isActive?: boolean;
  isInternal?: boolean;
  rank?: number;
  metaTitle?: string;
  metaDescription?: string;
}

export function createCategory(input: CreateCategoryInput): Promise<ProductCategoryOutput> {
  return apiFetch<ProductCategoryOutput>('/catalog/categories', { method: 'POST', body: input });
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  handle?: string;
  isActive?: boolean;
  isInternal?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export function updateCategory(id: string, input: UpdateCategoryInput): Promise<ProductCategoryOutput> {
  return apiFetch<ProductCategoryOutput>(`/catalog/categories/${id}`, { method: 'PATCH', body: input });
}

export function moveCategory(id: string, parentCategoryId: string | null, rank: number): Promise<ProductCategoryOutput> {
  return apiFetch<ProductCategoryOutput>(`/catalog/categories/${id}/move`, {
    method: 'PATCH',
    body: { parentCategoryId, rank },
  });
}

export function deleteCategory(id: string): Promise<void> {
  return apiFetch<void>(`/catalog/categories/${id}`, { method: 'DELETE' });
}

// ----- Productos -----

export interface ListProductsFilter {
  search?: string;
  status?: ProductStatus;
  categoryId?: string;
  collectionId?: string;
  salesChannelId?: string;
  page?: number;
  pageSize?: number;
}

export function listProducts(filter: ListProductsFilter = {}): Promise<ListProductsOutput> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return apiFetch<ListProductsOutput>(`/catalog/products${query ? `?${query}` : ''}`);
}

export function getProduct(id: string): Promise<ProductOutput> {
  return apiFetch<ProductOutput>(`/catalog/products/${id}`);
}

export function getVariantMatrix(id: string): Promise<VariantCombinationPreview[]> {
  return apiFetch<VariantCombinationPreview[]>(`/catalog/products/${id}/variant-matrix`);
}

export interface ProductFieldsInput {
  title?: string;
  handle?: string;
  subtitle?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  isGiftcard?: boolean;
  discountable?: boolean;
  weight?: number | null;
  length?: number | null;
  height?: number | null;
  width?: number | null;
  material?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  typeId?: string | null;
  brandId?: string | null;
  externalId?: string | null;
  metadata?: Record<string, unknown> | null;
  categoryIds?: string[];
  collectionIds?: string[];
  tagIds?: string[];
  salesChannelIds?: string[];
}

export interface CreateProductInput extends ProductFieldsInput {
  title: string;
  status?: ProductStatus;
  defaultVariantSku: string;
  defaultVariantTitle?: string;
}

export type UpdateProductInput = ProductFieldsInput;

export function createProduct(input: CreateProductInput): Promise<ProductOutput> {
  return apiFetch<ProductOutput>('/catalog/products', { method: 'POST', body: input });
}

export function updateProduct(id: string, input: UpdateProductInput): Promise<ProductOutput> {
  return apiFetch<ProductOutput>(`/catalog/products/${id}`, { method: 'PATCH', body: input });
}

export function setProductStatus(id: string, status: ProductStatus): Promise<ProductOutput> {
  return apiFetch<ProductOutput>(`/catalog/products/${id}/status`, { method: 'PATCH', body: { status } });
}

export function deleteProduct(id: string): Promise<void> {
  return apiFetch<void>(`/catalog/products/${id}`, { method: 'DELETE' });
}

// ----- Opciones de variante -----

export function addProductOption(productId: string, input: { title: string; values?: string[] }): Promise<ProductOutput> {
  return apiFetch<ProductOutput>(`/catalog/products/${productId}/options`, { method: 'POST', body: input });
}

export function updateProductOption(productId: string, optionId: string, title: string): Promise<ProductOutput> {
  return apiFetch<ProductOutput>(`/catalog/products/${productId}/options/${optionId}`, {
    method: 'PATCH',
    body: { title },
  });
}

export function removeProductOption(productId: string, optionId: string): Promise<ProductOutput> {
  return apiFetch<ProductOutput>(`/catalog/products/${productId}/options/${optionId}`, { method: 'DELETE' });
}

export function addProductOptionValue(productId: string, optionId: string, value: string): Promise<ProductOutput> {
  return apiFetch<ProductOutput>(`/catalog/products/${productId}/options/${optionId}/values`, {
    method: 'POST',
    body: { value },
  });
}

export function removeProductOptionValue(productId: string, optionId: string, valueId: string): Promise<ProductOutput> {
  return apiFetch<ProductOutput>(`/catalog/products/${productId}/options/${optionId}/values/${valueId}`, {
    method: 'DELETE',
  });
}

// ----- Variantes -----

export interface VariantFieldsInput {
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

export interface AddVariantInput extends VariantFieldsInput {
  title: string;
  sku: string;
  optionValueIds?: string[];
}

export interface UpdateVariantInput extends VariantFieldsInput {
  title?: string;
  sku?: string;
  optionValueIds?: string[];
}

export function addProductVariant(productId: string, input: AddVariantInput): Promise<ProductOutput> {
  return apiFetch<ProductOutput>(`/catalog/products/${productId}/variants`, { method: 'POST', body: input });
}

export function updateProductVariant(productId: string, variantId: string, input: UpdateVariantInput): Promise<ProductOutput> {
  return apiFetch<ProductOutput>(`/catalog/products/${productId}/variants/${variantId}`, {
    method: 'PATCH',
    body: input,
  });
}

export function removeProductVariant(productId: string, variantId: string): Promise<ProductOutput> {
  return apiFetch<ProductOutput>(`/catalog/products/${productId}/variants/${variantId}`, { method: 'DELETE' });
}

// ----- Especificaciones -----

export interface SpecificationInput {
  name?: string;
  value?: string;
  rank?: number;
}

export function addProductSpecification(
  productId: string,
  input: { name: string; value: string; rank?: number },
): Promise<ProductOutput> {
  return apiFetch<ProductOutput>(`/catalog/products/${productId}/specifications`, { method: 'POST', body: input });
}

export function updateProductSpecification(
  productId: string,
  specificationId: string,
  input: SpecificationInput,
): Promise<ProductOutput> {
  return apiFetch<ProductOutput>(`/catalog/products/${productId}/specifications/${specificationId}`, {
    method: 'PATCH',
    body: input,
  });
}

export function removeProductSpecification(productId: string, specificationId: string): Promise<ProductOutput> {
  return apiFetch<ProductOutput>(`/catalog/products/${productId}/specifications/${specificationId}`, {
    method: 'DELETE',
  });
}

// ----- Precios de variante -----

export function setVariantBasePrice(
  productId: string,
  variantId: string,
  input: { currencyCode: string; amount: number },
): Promise<ProductOutput> {
  return apiFetch<ProductOutput>(`/catalog/products/${productId}/variants/${variantId}/prices/base`, {
    method: 'PUT',
    body: input,
  });
}

export function addVariantTierPrice(
  productId: string,
  variantId: string,
  input: { currencyCode: string; amount: number; minQuantity: number; maxQuantity?: number | null },
): Promise<ProductOutput> {
  return apiFetch<ProductOutput>(`/catalog/products/${productId}/variants/${variantId}/prices/tiers`, {
    method: 'POST',
    body: input,
  });
}

export function updateVariantTierPrice(
  productId: string,
  variantId: string,
  priceId: string,
  input: { currencyCode?: string; amount?: number; minQuantity?: number; maxQuantity?: number | null },
): Promise<ProductOutput> {
  return apiFetch<ProductOutput>(`/catalog/products/${productId}/variants/${variantId}/prices/tiers/${priceId}`, {
    method: 'PATCH',
    body: input,
  });
}

export function removeVariantTierPrice(productId: string, variantId: string, priceId: string): Promise<ProductOutput> {
  return apiFetch<ProductOutput>(`/catalog/products/${productId}/variants/${variantId}/prices/tiers/${priceId}`, {
    method: 'DELETE',
  });
}

export function getEffectivePrice(
  productId: string,
  variantId: string,
  params: { currencyCode: string; quantity?: number; at?: string },
): Promise<EffectivePriceOutput> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  }
  return apiFetch<EffectivePriceOutput>(`/catalog/products/${productId}/variants/${variantId}/effective-price?${query.toString()}`);
}

// ----- Listas de precios -----

export interface ListPriceListsFilter {
  status?: PriceListStatus;
  page?: number;
  pageSize?: number;
}

export function listPriceLists(filter: ListPriceListsFilter = {}): Promise<ListPriceListsOutput> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return apiFetch<ListPriceListsOutput>(`/catalog/price-lists${query ? `?${query}` : ''}`);
}

export function getPriceList(id: string): Promise<PriceListOutput> {
  return apiFetch<PriceListOutput>(`/catalog/price-lists/${id}`);
}

export interface CreatePriceListInput {
  title: string;
  description?: string | null;
  status?: PriceListStatus;
  type?: PriceListType;
  startsAt?: string | null;
  endsAt?: string | null;
}

export function createPriceList(input: CreatePriceListInput): Promise<PriceListOutput> {
  return apiFetch<PriceListOutput>('/catalog/price-lists', { method: 'POST', body: input });
}

export interface UpdatePriceListInput {
  title?: string;
  description?: string | null;
  type?: PriceListType;
  startsAt?: string | null;
  endsAt?: string | null;
}

export function updatePriceList(id: string, input: UpdatePriceListInput): Promise<PriceListOutput> {
  return apiFetch<PriceListOutput>(`/catalog/price-lists/${id}`, { method: 'PATCH', body: input });
}

export function setPriceListStatus(id: string, status: PriceListStatus): Promise<PriceListOutput> {
  return apiFetch<PriceListOutput>(`/catalog/price-lists/${id}/status`, { method: 'PATCH', body: { status } });
}

export function deletePriceList(id: string): Promise<void> {
  return apiFetch<void>(`/catalog/price-lists/${id}`, { method: 'DELETE' });
}

export function addPriceListPrice(
  priceListId: string,
  input: { variantId: string; currencyCode: string; amount: number; minQuantity?: number | null; maxQuantity?: number | null },
): Promise<PriceListOutput> {
  return apiFetch<PriceListOutput>(`/catalog/price-lists/${priceListId}/prices`, { method: 'POST', body: input });
}

export function updatePriceListPrice(
  priceListId: string,
  priceId: string,
  input: { amount?: number; minQuantity?: number | null; maxQuantity?: number | null },
): Promise<PriceListOutput> {
  return apiFetch<PriceListOutput>(`/catalog/price-lists/${priceListId}/prices/${priceId}`, { method: 'PATCH', body: input });
}

export function removePriceListPrice(priceListId: string, priceId: string): Promise<PriceListOutput> {
  return apiFetch<PriceListOutput>(`/catalog/price-lists/${priceListId}/prices/${priceId}`, { method: 'DELETE' });
}
