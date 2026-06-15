export type UserStatus = 'invited' | 'active' | 'locked' | 'disabled';

export interface UserStoreRoleOutput {
  assignmentId: string;
  storeId: string | null;
  roleId: string;
  roleName: string;
}

export interface UserOutput {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  storeRoles: UserStoreRoleOutput[];
}

export interface RoleOutput {
  id: string;
  name: string;
  isSystem: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StoreOutput {
  id: string;
  name: string;
  code: string;
  url: string | null;
  currencyCode: string;
  regionId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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

export interface ValueTaxonomyOutput {
  id: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesChannelOutput {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCollectionOutput {
  id: string;
  title: string;
  handle: string;
  createdAt: string;
  updatedAt: string;
}

export type ProductStatus = 'draft' | 'proposed' | 'published' | 'rejected';

export interface ProductOptionValueOutput {
  id: string;
  value: string;
  metadata: Record<string, unknown> | null;
}

export interface ProductOptionOutput {
  id: string;
  title: string;
  values: ProductOptionValueOutput[];
  metadata: Record<string, unknown> | null;
}

export interface VariantPriceOutput {
  id: string;
  currencyCode: string;
  amount: number;
  minQuantity: number | null;
  maxQuantity: number | null;
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

export type EffectivePriceSource = 'price_list' | 'sale' | 'tier_price' | 'base_price';

export interface EffectivePriceOutput {
  currencyCode: string;
  amount: number;
  source: EffectivePriceSource;
  basePrice: number | null;
  priceListId: string | null;
}

export type PriceListStatus = 'draft' | 'active';
export type PriceListType = 'sale' | 'override';

export interface PriceListPriceOutput {
  id: string;
  variantId: string;
  currencyCode: string;
  amount: number;
  minQuantity: number | null;
  maxQuantity: number | null;
}

export interface PriceListOutput {
  id: string;
  title: string;
  description: string | null;
  status: PriceListStatus;
  type: PriceListType;
  startsAt: string | null;
  endsAt: string | null;
  prices: PriceListPriceOutput[];
  createdAt: string;
  updatedAt: string;
}

export interface ListPriceListsOutput {
  items: PriceListOutput[];
  total: number;
  page: number;
  pageSize: number;
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
  status: ProductStatus;
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

export interface ListProductsOutputItem {
  id: string;
  title: string;
  handle: string;
  status: ProductStatus;
  thumbnail: string | null;
  brandId: string | null;
  typeId: string | null;
  variantCount: number;
  defaultSku: string | null;
  updatedAt: string;
}

export interface ListProductsOutput {
  items: ListProductsOutputItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface VariantCombinationPreview {
  optionValueIds: string[];
  label: string;
  exists: boolean;
}

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

export type SettingType = 'string' | 'number' | 'boolean' | 'json';
export type SettingSource = 'override' | 'global' | 'default';

export interface SettingOutput {
  key: string;
  type: SettingType;
  value: unknown;
  storeId: string | null;
  source: SettingSource;
}

export interface ActivityLogEntryOutput {
  id: string;
  userId: string | null;
  storeId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  ip: string | null;
  diff: Record<string, unknown> | null;
  createdAt: string;
}

export interface ActivityLogPage {
  items: ActivityLogEntryOutput[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CurrencyOutput {
  code: string;
  symbol: string;
  symbolNative: string;
  decimalDigits: number;
  rounding: number;
  name: string;
}

export interface RegionOutput {
  id: string;
  name: string;
  currencyCode: string;
  automaticTaxes: boolean;
  isActive: boolean;
}

export interface RegionDetailOutput extends RegionOutput {
  countriesIso2: string[];
  paymentProviderIds: string[];
}

export interface CountryOutput {
  iso2: string;
  iso3: string;
  numCode: string;
  name: string;
  displayName: string;
}

export interface PaymentProviderOutput {
  id: string;
  code: string;
  name: string;
}

export interface TerritoryOutput {
  id: string;
  regionId: string;
  name: string;
  code: string;
  isActive: boolean;
  automaticFulfillment: boolean;
  minSubtotal: number | null;
  minSubtotalWithTax: boolean;
  freeShippingThreshold: number | null;
  freeShippingThresholdWithTax: boolean;
  freeShippingNoDiscount: boolean;
  shippingCost: number | null;
  description: string | null;
}

export interface ZoneOutput {
  id: string;
  territoryId: string;
  name: string;
  code: string;
  isActive: boolean;
  description: string | null;
}

export interface StockLocationOutput {
  id: string;
  name: string;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryLevelOutput {
  id: string;
  locationId: string;
  stockedQuantity: number;
  reservedQuantity: number;
  incomingQuantity: number;
  availableQuantity: number;
}

export interface InventoryItemOutput {
  id: string;
  sku: string | null;
  title: string | null;
  requiresShipping: boolean;
  variantId: string | null;
  requiredQuantity: number;
  metadata: Record<string, unknown> | null;
  levels: InventoryLevelOutput[];
  createdAt: string;
  updatedAt: string;
}

export interface ListInventoryItemsOutput {
  items: InventoryItemOutput[];
  total: number;
  page: number;
  pageSize: number;
}

// ----- Orders -----

export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type OrderPaymentStatus = 'pending' | 'authorized' | 'paid' | 'partially_refunded' | 'refunded' | 'failed' | 'voided' | 'cancelled';

export interface OrderLineOutput {
  id: string;
  variantId: string;
  productId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  quantity: number;
  currencyCode: string;
  unitPrice: number;
  taxAmount: number;
  total: number;
  stockLocationId: string;
}

export interface OrderTransitionOutput {
  id: string;
  kind: 'order' | 'payment';
  from: string;
  to: string;
  actorId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface OrderNoteOutput {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface OrderOutput {
  id: string;
  storeId: string;
  orderNumber: string;
  cartId: string;
  customerId: string;
  customerEmail: string | null;
  channel: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  currencyCode: string;
  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  shippingAddress: Record<string, unknown>;
  billingAddress: Record<string, unknown>;
  shippingMethod: Record<string, unknown>;
  paymentMethod: Record<string, unknown>;
  reservationExpiresAt: string | null;
  lines: OrderLineOutput[];
  transitions: OrderTransitionOutput[];
  notes: OrderNoteOutput[];
  createdAt: string;
  updatedAt: string;
}
