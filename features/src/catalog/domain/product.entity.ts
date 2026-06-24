import { Entity } from '@mitama/core';
import { slugify } from './slug';

export type ProductStatus = 'draft' | 'proposed' | 'published' | 'rejected';

export interface ProductOptionValueProps {
  id: string;
  value: string;
  metadata: Record<string, unknown> | null;
}

export interface ProductOptionProps {
  id: string;
  title: string;
  values: ProductOptionValueProps[];
  metadata: Record<string, unknown> | null;
}

/**
 * Precio de una variante. `minQuantity === null` representa el precio base
 * en `currencyCode`; `minQuantity` definido representa un tier price (precio
 * por cantidad, aplica desde `minQuantity` hasta `maxQuantity` si existe).
 */
export interface VariantPriceProps {
  id: string;
  currencyCode: string;
  amount: number;
  minQuantity: number | null;
  maxQuantity: number | null;
}

export interface ProductVariantProps {
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
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
  weight: number | null;
  length: number | null;
  height: number | null;
  width: number | null;
  variantRank: number;
  /** Ids de `ProductOptionValue`, una por cada opción del producto. */
  optionValueIds: string[];
  /** Precios base y tier prices de la variante (ver `VariantPriceProps`). */
  prices: VariantPriceProps[];
  metadata: Record<string, unknown> | null;
}

export interface ProductSpecificationProps {
  id: string;
  name: string;
  value: string;
  rank: number;
}

/** Combinación de valores de opciones (matriz de variantes). */
export interface VariantCombination {
  optionValueIds: string[];
  label: string;
}

interface ProductProps {
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
  options: ProductOptionProps[];
  variants: ProductVariantProps[];
  specifications: ProductSpecificationProps[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Producto. Aggregate root: agrupa opciones, variantes (la unidad vendible) y
 * especificaciones. Nunca existe sin al menos una variante (un producto
 * "simple" es un producto sin opciones con una única variante por defecto).
 */
export class Product extends Entity<ProductProps> {
  static create(props: {
    title: string;
    handle?: string | null;
    subtitle?: string | null;
    description?: string | null;
    status?: ProductStatus;
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
    /** SKU de la variante por defecto (producto simple). */
    defaultVariantSku: string;
    defaultVariantTitle?: string;
  }): Product {
    const now = new Date();
    const handle = props.handle ? slugify(props.handle) : slugify(props.title);

    const defaultVariant: ProductVariantProps = {
      id: crypto.randomUUID(),
      title: props.defaultVariantTitle ?? 'Default',
      sku: props.defaultVariantSku,
      barcode: null,
      ean: null,
      upc: null,
      allowBackorder: false,
      manageInventory: true,
      lowStockThreshold: null,
      cost: null,
      salePrice: null,
      saleStartsAt: null,
      saleEndsAt: null,
      weight: null,
      length: null,
      height: null,
      width: null,
      variantRank: 0,
      optionValueIds: [],
      prices: [],
      metadata: null,
    };

    return new Product(crypto.randomUUID(), {
      title: props.title,
      handle,
      subtitle: props.subtitle ?? null,
      description: props.description ?? null,
      status: props.status ?? 'draft',
      thumbnail: props.thumbnail ?? null,
      isGiftcard: props.isGiftcard ?? false,
      discountable: props.discountable ?? true,
      weight: props.weight ?? null,
      length: props.length ?? null,
      height: props.height ?? null,
      width: props.width ?? null,
      material: props.material ?? null,
      metaTitle: props.metaTitle ?? null,
      metaDescription: props.metaDescription ?? null,
      typeId: props.typeId ?? null,
      brandId: props.brandId ?? null,
      externalId: props.externalId ?? null,
      metadata: props.metadata ?? null,
      categoryIds: props.categoryIds ?? [],
      collectionIds: props.collectionIds ?? [],
      tagIds: props.tagIds ?? [],
      salesChannelIds: props.salesChannelIds ?? [],
      options: [],
      variants: [defaultVariant],
      specifications: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: ProductProps, id: string): Product {
    return new Product(id, props);
  }

  get title(): string {
    return this.props.title;
  }

  get handle(): string {
    return this.props.handle;
  }

  get subtitle(): string | null {
    return this.props.subtitle;
  }

  get description(): string | null {
    return this.props.description;
  }

  get status(): ProductStatus {
    return this.props.status;
  }

  get thumbnail(): string | null {
    return this.props.thumbnail;
  }

  get isGiftcard(): boolean {
    return this.props.isGiftcard;
  }

  get discountable(): boolean {
    return this.props.discountable;
  }

  get weight(): number | null {
    return this.props.weight;
  }

  get length(): number | null {
    return this.props.length;
  }

  get height(): number | null {
    return this.props.height;
  }

  get width(): number | null {
    return this.props.width;
  }

  get material(): string | null {
    return this.props.material;
  }

  get metaTitle(): string | null {
    return this.props.metaTitle;
  }

  get metaDescription(): string | null {
    return this.props.metaDescription;
  }

  get typeId(): string | null {
    return this.props.typeId;
  }

  get brandId(): string | null {
    return this.props.brandId;
  }

  get externalId(): string | null {
    return this.props.externalId;
  }

  get metadata(): Record<string, unknown> | null {
    return this.props.metadata;
  }

  get categoryIds(): string[] {
    return [...this.props.categoryIds];
  }

  get collectionIds(): string[] {
    return [...this.props.collectionIds];
  }

  get tagIds(): string[] {
    return [...this.props.tagIds];
  }

  get salesChannelIds(): string[] {
    return [...this.props.salesChannelIds];
  }

  get options(): ProductOptionProps[] {
    return this.props.options.map((option) => ({ ...option, values: [...option.values] }));
  }

  get variants(): ProductVariantProps[] {
    return this.props.variants.map((variant) => ({
      ...variant,
      optionValueIds: [...variant.optionValueIds],
      prices: variant.prices.map((price) => ({ ...price })),
    }));
  }

  get specifications(): ProductSpecificationProps[] {
    return [...this.props.specifications];
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Aplica cambios a los datos generales. Devuelve el slug anterior si el
   * slug cambió (para que el caso de uso registre el redirect 301).
   */
  update(changes: {
    title?: string;
    handle?: string | null;
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
  }): string | null {
    let previousHandle: string | null = null;

    if (changes.handle !== undefined && changes.handle !== null) {
      const next = slugify(changes.handle);
      if (next && next !== this.props.handle) {
        previousHandle = this.props.handle;
        this.props.handle = next;
      }
    }
    if (changes.title !== undefined) {
      this.props.title = changes.title;
    }
    if (changes.subtitle !== undefined) {
      this.props.subtitle = changes.subtitle;
    }
    if (changes.description !== undefined) {
      this.props.description = changes.description;
    }
    if (changes.thumbnail !== undefined) {
      this.props.thumbnail = changes.thumbnail;
    }
    if (changes.isGiftcard !== undefined) {
      this.props.isGiftcard = changes.isGiftcard;
    }
    if (changes.discountable !== undefined) {
      this.props.discountable = changes.discountable;
    }
    if (changes.weight !== undefined) {
      this.props.weight = changes.weight;
    }
    if (changes.length !== undefined) {
      this.props.length = changes.length;
    }
    if (changes.height !== undefined) {
      this.props.height = changes.height;
    }
    if (changes.width !== undefined) {
      this.props.width = changes.width;
    }
    if (changes.material !== undefined) {
      this.props.material = changes.material;
    }
    if (changes.metaTitle !== undefined) {
      this.props.metaTitle = changes.metaTitle;
    }
    if (changes.metaDescription !== undefined) {
      this.props.metaDescription = changes.metaDescription;
    }
    if (changes.typeId !== undefined) {
      this.props.typeId = changes.typeId;
    }
    if (changes.brandId !== undefined) {
      this.props.brandId = changes.brandId;
    }
    if (changes.externalId !== undefined) {
      this.props.externalId = changes.externalId;
    }
    if (changes.metadata !== undefined) {
      this.props.metadata = changes.metadata;
    }
    this.props.updatedAt = new Date();
    return previousHandle;
  }

  setStatus(status: ProductStatus): void {
    this.props.status = status;
    this.props.updatedAt = new Date();
  }

  setCategories(categoryIds: string[]): void {
    this.props.categoryIds = [...new Set(categoryIds)];
    this.props.updatedAt = new Date();
  }

  setCollections(collectionIds: string[]): void {
    this.props.collectionIds = [...new Set(collectionIds)];
    this.props.updatedAt = new Date();
  }

  setTags(tagIds: string[]): void {
    this.props.tagIds = [...new Set(tagIds)];
    this.props.updatedAt = new Date();
  }

  setSalesChannels(salesChannelIds: string[]): void {
    this.props.salesChannelIds = [...new Set(salesChannelIds)];
    this.props.updatedAt = new Date();
  }

  // ----- Opciones -----

  addOption(title: string, values: string[] = []): ProductOptionProps {
    const option: ProductOptionProps = {
      id: crypto.randomUUID(),
      title,
      values: values.map((value) => ({ id: crypto.randomUUID(), value, metadata: null })),
      metadata: null,
    };
    this.props.options.push(option);
    this.props.updatedAt = new Date();
    return { ...option, values: [...option.values] };
  }

  updateOption(optionId: string, changes: { title?: string }): ProductOptionProps | null {
    const option = this.props.options.find((candidate) => candidate.id === optionId);
    if (!option) {
      return null;
    }
    if (changes.title !== undefined) {
      option.title = changes.title;
    }
    this.props.updatedAt = new Date();
    return { ...option, values: [...option.values] };
  }

  /** Elimina una opción y limpia las referencias en las variantes. */
  removeOption(optionId: string): boolean {
    const option = this.props.options.find((candidate) => candidate.id === optionId);
    if (!option) {
      return false;
    }
    const valueIds = new Set(option.values.map((value) => value.id));
    this.props.options = this.props.options.filter((candidate) => candidate.id !== optionId);
    for (const variant of this.props.variants) {
      variant.optionValueIds = variant.optionValueIds.filter((id) => !valueIds.has(id));
    }
    this.props.updatedAt = new Date();
    return true;
  }

  addOptionValue(optionId: string, value: string): ProductOptionValueProps | null {
    const option = this.props.options.find((candidate) => candidate.id === optionId);
    if (!option) {
      return null;
    }
    const optionValue: ProductOptionValueProps = { id: crypto.randomUUID(), value, metadata: null };
    option.values.push(optionValue);
    this.props.updatedAt = new Date();
    return { ...optionValue };
  }

  /** Elimina un valor de opción y lo quita de las variantes que lo referencien. */
  removeOptionValue(optionId: string, valueId: string): boolean {
    const option = this.props.options.find((candidate) => candidate.id === optionId);
    if (!option) {
      return false;
    }
    const exists = option.values.some((value) => value.id === valueId);
    if (!exists) {
      return false;
    }
    option.values = option.values.filter((value) => value.id !== valueId);
    for (const variant of this.props.variants) {
      variant.optionValueIds = variant.optionValueIds.filter((id) => id !== valueId);
    }
    this.props.updatedAt = new Date();
    return true;
  }

  // ----- Variantes -----

  /** Todas las combinaciones posibles según las opciones actuales (producto cartesiano). */
  optionCombinations(): VariantCombination[] {
    if (this.props.options.length === 0) {
      return [];
    }
    let combinations: VariantCombination[] = [{ optionValueIds: [], label: '' }];
    for (const option of this.props.options) {
      if (option.values.length === 0) {
        return [];
      }
      const next: VariantCombination[] = [];
      for (const combination of combinations) {
        for (const value of option.values) {
          next.push({
            optionValueIds: [...combination.optionValueIds, value.id],
            label: combination.label ? `${combination.label} / ${value.value}` : value.value,
          });
        }
      }
      combinations = next;
    }
    return combinations;
  }

  /** Combinaciones que aún no tienen una variante creada. */
  missingVariantCombinations(): VariantCombination[] {
    const existing = new Set(this.props.variants.map((variant) => this.combinationKey(variant.optionValueIds)));
    return this.optionCombinations().filter((combination) => !existing.has(this.combinationKey(combination.optionValueIds)));
  }

  private combinationKey(optionValueIds: string[]): string {
    return [...optionValueIds].sort().join('|');
  }

  /** true si ya existe una variante con exactamente esa combinación de valores. */
  hasVariantCombination(optionValueIds: string[]): boolean {
    const key = this.combinationKey(optionValueIds);
    return this.props.variants.some((variant) => this.combinationKey(variant.optionValueIds) === key);
  }

  /** Valida que cada id de `optionValueIds` exista entre las opciones del producto. */
  hasValidOptionValueIds(optionValueIds: string[]): boolean {
    const allValueIds = new Set(this.props.options.flatMap((option) => option.values.map((value) => value.id)));
    return optionValueIds.every((id) => allValueIds.has(id));
  }

  addVariant(props: {
    title: string;
    sku: string;
    optionValueIds?: string[];
    barcode?: string | null;
    ean?: string | null;
    upc?: string | null;
    allowBackorder?: boolean;
    manageInventory?: boolean;
    lowStockThreshold?: number | null;
    cost?: number | null;
    salePrice?: number | null;
    saleStartsAt?: Date | null;
    saleEndsAt?: Date | null;
    weight?: number | null;
    length?: number | null;
    height?: number | null;
    width?: number | null;
    variantRank?: number;
    metadata?: Record<string, unknown> | null;
  }): ProductVariantProps {
    const variant: ProductVariantProps = {
      id: crypto.randomUUID(),
      title: props.title,
      sku: props.sku,
      barcode: props.barcode ?? null,
      ean: props.ean ?? null,
      upc: props.upc ?? null,
      allowBackorder: props.allowBackorder ?? false,
      manageInventory: props.manageInventory ?? true,
      lowStockThreshold: props.lowStockThreshold ?? null,
      cost: props.cost ?? null,
      salePrice: props.salePrice ?? null,
      saleStartsAt: props.saleStartsAt ?? null,
      saleEndsAt: props.saleEndsAt ?? null,
      weight: props.weight ?? null,
      length: props.length ?? null,
      height: props.height ?? null,
      width: props.width ?? null,
      variantRank: props.variantRank ?? this.props.variants.length,
      optionValueIds: props.optionValueIds ?? [],
      prices: [],
      metadata: props.metadata ?? null,
    };
    this.props.variants.push(variant);
    this.props.updatedAt = new Date();
    return { ...variant, optionValueIds: [...variant.optionValueIds], prices: [] };
  }

  updateVariant(
    variantId: string,
    changes: Partial<Omit<ProductVariantProps, 'id' | 'optionValueIds'>> & { optionValueIds?: string[] },
  ): ProductVariantProps | null {
    const variant = this.props.variants.find((candidate) => candidate.id === variantId);
    if (!variant) {
      return null;
    }
    for (const [key, value] of Object.entries(changes)) {
      if (value !== undefined) {
        (variant as unknown as Record<string, unknown>)[key] = value;
      }
    }
    this.props.updatedAt = new Date();
    return { ...variant, optionValueIds: [...variant.optionValueIds], prices: variant.prices.map((price) => ({ ...price })) };
  }

  /** Elimina una variante. No se permite eliminar la última (siempre debe existir >= 1). */
  removeVariant(variantId: string): 'removed' | 'not_found' | 'last_variant' {
    if (this.props.variants.length <= 1) {
      return 'last_variant';
    }
    const index = this.props.variants.findIndex((candidate) => candidate.id === variantId);
    if (index === -1) {
      return 'not_found';
    }
    this.props.variants.splice(index, 1);
    this.props.updatedAt = new Date();
    return 'removed';
  }

  // ----- Precios -----

  /** Crea o actualiza el precio base (sin cantidad mínima) de una variante en una moneda. */
  setVariantBasePrice(variantId: string, currencyCode: string, amount: number): VariantPriceProps | 'not_found' {
    const variant = this.props.variants.find((candidate) => candidate.id === variantId);
    if (!variant) {
      return 'not_found';
    }
    const existing = variant.prices.find((price) => price.minQuantity === null && price.currencyCode === currencyCode);
    if (existing) {
      existing.amount = amount;
      this.props.updatedAt = new Date();
      return { ...existing };
    }
    const price: VariantPriceProps = { id: crypto.randomUUID(), currencyCode, amount, minQuantity: null, maxQuantity: null };
    variant.prices.push(price);
    this.props.updatedAt = new Date();
    return { ...price };
  }

  /** Agrega un tier price (precio por cantidad) a una variante. */
  addVariantTierPrice(
    variantId: string,
    props: { currencyCode: string; amount: number; minQuantity: number; maxQuantity?: number | null },
  ): VariantPriceProps | 'not_found' | 'invalid_range' {
    const variant = this.props.variants.find((candidate) => candidate.id === variantId);
    if (!variant) {
      return 'not_found';
    }
    const maxQuantity = props.maxQuantity ?? null;
    if (props.minQuantity < 1 || (maxQuantity !== null && maxQuantity < props.minQuantity)) {
      return 'invalid_range';
    }
    const price: VariantPriceProps = {
      id: crypto.randomUUID(),
      currencyCode: props.currencyCode,
      amount: props.amount,
      minQuantity: props.minQuantity,
      maxQuantity,
    };
    variant.prices.push(price);
    this.props.updatedAt = new Date();
    return { ...price };
  }

  /** Actualiza un tier price existente de una variante. */
  updateVariantTierPrice(
    variantId: string,
    priceId: string,
    changes: { currencyCode?: string; amount?: number; minQuantity?: number; maxQuantity?: number | null },
  ): VariantPriceProps | 'not_found' | 'invalid_range' {
    const variant = this.props.variants.find((candidate) => candidate.id === variantId);
    if (!variant) {
      return 'not_found';
    }
    const price = variant.prices.find((candidate) => candidate.id === priceId && candidate.minQuantity !== null);
    if (!price) {
      return 'not_found';
    }
    const minQuantity = changes.minQuantity ?? price.minQuantity;
    const maxQuantity = changes.maxQuantity !== undefined ? changes.maxQuantity : price.maxQuantity;
    if (minQuantity === null || minQuantity < 1 || (maxQuantity !== null && maxQuantity < minQuantity)) {
      return 'invalid_range';
    }
    if (changes.currencyCode !== undefined) {
      price.currencyCode = changes.currencyCode;
    }
    if (changes.amount !== undefined) {
      price.amount = changes.amount;
    }
    price.minQuantity = minQuantity;
    price.maxQuantity = maxQuantity;
    this.props.updatedAt = new Date();
    return { ...price };
  }

  /** Elimina un tier price de una variante. No afecta el precio base. */
  removeVariantTierPrice(variantId: string, priceId: string): boolean {
    const variant = this.props.variants.find((candidate) => candidate.id === variantId);
    if (!variant) {
      return false;
    }
    const index = variant.prices.findIndex((candidate) => candidate.id === priceId && candidate.minQuantity !== null);
    if (index === -1) {
      return false;
    }
    variant.prices.splice(index, 1);
    this.props.updatedAt = new Date();
    return true;
  }

  // ----- Especificaciones -----

  addSpecification(name: string, value: string, rank?: number): ProductSpecificationProps {
    const specification: ProductSpecificationProps = {
      id: crypto.randomUUID(),
      name,
      value,
      rank: rank ?? this.props.specifications.length,
    };
    this.props.specifications.push(specification);
    this.props.updatedAt = new Date();
    return { ...specification };
  }

  updateSpecification(id: string, changes: { name?: string; value?: string; rank?: number }): ProductSpecificationProps | null {
    const specification = this.props.specifications.find((candidate) => candidate.id === id);
    if (!specification) {
      return null;
    }
    for (const [key, value] of Object.entries(changes)) {
      if (value !== undefined) {
        (specification as unknown as Record<string, unknown>)[key] = value;
      }
    }
    this.props.updatedAt = new Date();
    return { ...specification };
  }

  removeSpecification(id: string): boolean {
    const index = this.props.specifications.findIndex((candidate) => candidate.id === id);
    if (index === -1) {
      return false;
    }
    this.props.specifications.splice(index, 1);
    this.props.updatedAt = new Date();
    return true;
  }
}
