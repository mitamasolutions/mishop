import type { RecordActivityInput } from '@mitama/activity-log';
import { Product } from '../../domain/product.entity';
import type { ProductFilter, ProductPage, ProductReader, ProductWriter } from '../../domain/product.repository';
import type { SlugRedirect } from '../../domain/brand.repository';
import { PriceList } from '../../domain/price-list.entity';
import type { PriceListFilter, PriceListPage, PriceListRepository } from '../../domain/price-list.repository';

export class InMemoryProductRepository implements ProductReader, ProductWriter {
  readonly products = new Map<string, Product>();
  readonly activities: RecordActivityInput[] = [];
  readonly redirects: SlugRedirect[] = [];

  async findById(id: string): Promise<Product | null> {
    return this.products.get(id) ?? null;
  }

  async findByHandle(handle: string): Promise<Product | null> {
    for (const product of this.products.values()) {
      if (product.handle === handle) {
        return product;
      }
    }
    return null;
  }

  async findAll(filter: ProductFilter): Promise<ProductPage> {
    let items = [...this.products.values()];

    if (filter.search) {
      const search = filter.search.toLowerCase();
      items = items.filter(
        (product) =>
          product.title.toLowerCase().includes(search) ||
          product.handle.toLowerCase().includes(search) ||
          product.variants.some((variant) => variant.sku.toLowerCase().includes(search)),
      );
    }
    if (filter.status) {
      items = items.filter((product) => product.status === filter.status);
    }
    if (filter.categoryId) {
      items = items.filter((product) => product.categoryIds.includes(filter.categoryId!));
    }
    if (filter.collectionId) {
      items = items.filter((product) => product.collectionIds.includes(filter.collectionId!));
    }
    if (filter.salesChannelId) {
      items = items.filter((product) => product.salesChannelIds.includes(filter.salesChannelId!));
    }

    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const total = items.length;
    const start = (page - 1) * pageSize;

    return { items: items.slice(start, start + pageSize), total, page, pageSize };
  }

  async findVariantBySku(sku: string): Promise<{ productId: string; variantId: string } | null> {
    for (const product of this.products.values()) {
      const variant = product.variants.find((candidate) => candidate.sku === sku);
      if (variant) {
        return { productId: product.id, variantId: variant.id };
      }
    }
    return null;
  }

  async findVariantById(variantId: string): Promise<{ productId: string; variantId: string } | null> {
    for (const product of this.products.values()) {
      const variant = product.variants.find((candidate) => candidate.id === variantId);
      if (variant) {
        return { productId: product.id, variantId: variant.id };
      }
    }
    return null;
  }

  async create(product: Product, activity: RecordActivityInput): Promise<void> {
    this.products.set(product.id, product);
    this.activities.push(activity);
  }

  async update(product: Product, activity: RecordActivityInput, redirect: SlugRedirect | null): Promise<void> {
    this.products.set(product.id, product);
    this.activities.push(activity);
    if (redirect) {
      this.redirects.push(redirect);
    }
  }

  async remove(product: Product, activity: RecordActivityInput): Promise<void> {
    this.products.delete(product.id);
    this.activities.push(activity);
  }
}

export class InMemoryPriceListRepository implements PriceListRepository {
  readonly priceLists = new Map<string, PriceList>();
  readonly activities: RecordActivityInput[] = [];

  async findById(id: string): Promise<PriceList | null> {
    return this.priceLists.get(id) ?? null;
  }

  async findAll(filter: PriceListFilter): Promise<PriceListPage> {
    let items = [...this.priceLists.values()];
    if (filter.status) {
      items = items.filter((priceList) => priceList.status === filter.status);
    }

    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const total = items.length;
    const start = (page - 1) * pageSize;

    return { items: items.slice(start, start + pageSize), total, page, pageSize };
  }

  async findActive(): Promise<PriceList[]> {
    return [...this.priceLists.values()].filter((priceList) => priceList.status === 'active');
  }

  async create(priceList: PriceList, activity: RecordActivityInput): Promise<void> {
    this.priceLists.set(priceList.id, priceList);
    this.activities.push(activity);
  }

  async update(priceList: PriceList, activity: RecordActivityInput): Promise<void> {
    this.priceLists.set(priceList.id, priceList);
    this.activities.push(activity);
  }

  async remove(priceList: PriceList, activity: RecordActivityInput): Promise<void> {
    this.priceLists.delete(priceList.id);
    this.activities.push(activity);
  }
}
