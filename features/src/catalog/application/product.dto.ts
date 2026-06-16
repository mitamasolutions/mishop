import type {
  Product,
  ProductOptionProps,
  ProductSpecificationProps,
  ProductVariantProps,
  VariantPriceProps,
} from '../domain/product.entity';

export interface ProductOptionValueOutput {
  id: string;
  value: string;
  metadata: Record<string, unknown> | null;
}

export interface VariantPriceOutput {
  id: string;
  currencyCode: string;
  amount: number;
  minQuantity: number | null;
  maxQuantity: number | null;
}

export interface ProductOptionOutput {
  id: string;
  title: string;
  values: ProductOptionValueOutput[];
  metadata: Record<string, unknown> | null;
}

export interface ProductVariantOutput {
  id: string;
  title: string;
  sku: string;
  barcode: string | null;
  ean: string | null;
  upc: string | null;
  allowBackorder: boolean;
  manageInventory: boolean;
  lowStockThreshold: number | null;
  cost: number | null;
  salePrice: number | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  weight: number | null;
  length: number | null;
  height: number | null;
  width: number | null;
  variantRank: number;
  optionValueIds: string[];
  prices: VariantPriceOutput[];
  metadata: Record<string, unknown> | null;
}

export interface ProductSpecificationOutput {
  id: string;
  name: string;
  value: string;
  rank: number;
}

export interface ProductOutput {
  id: string;
  title: string;
  handle: string;
  subtitle: string | null;
  description: string | null;
  status: string;
  thumbnail: string | null;
  isGiftcard: boolean;
  discountable: boolean;
  weight: number | null;
  length: number | null;
  height: number | null;
  width: number | null;
  material: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  typeId: string | null;
  brandId: string | null;
  externalId: string | null;
  metadata: Record<string, unknown> | null;
  categoryIds: string[];
  collectionIds: string[];
  tagIds: string[];
  salesChannelIds: string[];
  options: ProductOptionOutput[];
  variants: ProductVariantOutput[];
  specifications: ProductSpecificationOutput[];
  createdAt: string;
  updatedAt: string;
}

function toOptionOutput(option: ProductOptionProps): ProductOptionOutput {
  return {
    id: option.id,
    title: option.title,
    values: option.values.map((value) => ({ id: value.id, value: value.value, metadata: value.metadata })),
    metadata: option.metadata,
  };
}

function toVariantOutput(variant: ProductVariantProps): ProductVariantOutput {
  return {
    id: variant.id,
    title: variant.title,
    sku: variant.sku,
    barcode: variant.barcode,
    ean: variant.ean,
    upc: variant.upc,
    allowBackorder: variant.allowBackorder,
    manageInventory: variant.manageInventory,
    lowStockThreshold: variant.lowStockThreshold,
    cost: variant.cost,
    salePrice: variant.salePrice,
    saleStartsAt: variant.saleStartsAt ? variant.saleStartsAt.toISOString() : null,
    saleEndsAt: variant.saleEndsAt ? variant.saleEndsAt.toISOString() : null,
    weight: variant.weight,
    length: variant.length,
    height: variant.height,
    width: variant.width,
    variantRank: variant.variantRank,
    optionValueIds: variant.optionValueIds,
    prices: variant.prices.map(toVariantPriceOutput),
    metadata: variant.metadata,
  };
}

function toVariantPriceOutput(price: VariantPriceProps): VariantPriceOutput {
  return {
    id: price.id,
    currencyCode: price.currencyCode,
    amount: price.amount,
    minQuantity: price.minQuantity,
    maxQuantity: price.maxQuantity,
  };
}

function toSpecificationOutput(specification: ProductSpecificationProps): ProductSpecificationOutput {
  return { id: specification.id, name: specification.name, value: specification.value, rank: specification.rank };
}

export function toProductOutput(product: Product): ProductOutput {
  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    subtitle: product.subtitle,
    description: product.description,
    status: product.status,
    thumbnail: product.thumbnail,
    isGiftcard: product.isGiftcard,
    discountable: product.discountable,
    weight: product.weight,
    length: product.length,
    height: product.height,
    width: product.width,
    material: product.material,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    typeId: product.typeId,
    brandId: product.brandId,
    externalId: product.externalId,
    metadata: product.metadata,
    categoryIds: product.categoryIds,
    collectionIds: product.collectionIds,
    tagIds: product.tagIds,
    salesChannelIds: product.salesChannelIds,
    options: product.options.map(toOptionOutput),
    variants: product.variants.map(toVariantOutput),
    specifications: product.specifications.map(toSpecificationOutput),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
