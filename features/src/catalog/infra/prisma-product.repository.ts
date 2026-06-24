import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@mitama/data';
import { recordActivity, type RecordActivityInput } from '../../activity-log';
import {
  Product,
  type ProductOptionProps,
  type ProductSpecificationProps,
  type ProductStatus,
  type ProductVariantProps,
  type VariantPriceProps,
} from '../domain/product.entity';
import type { ProductFilter, ProductPage, ProductReader, ProductWriter } from '../domain/product.repository';
import type { SlugRedirect } from '../domain/brand.repository';

const PRODUCT_INCLUDE = {
  options: { include: { values: true } },
  variants: { include: { options: true, priceSet: { include: { prices: true } } } },
  specifications: true,
  categories: true,
  collections: { select: { id: true } },
  tags: { select: { id: true } },
  salesChannels: { select: { id: true } },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof PRODUCT_INCLUDE }>;

@Injectable()
export class PrismaProductRepository implements ProductReader, ProductWriter {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Product | null> {
    const row = await this.prisma.product.findFirst({ where: { id, deletedAt: null }, include: PRODUCT_INCLUDE });
    return row ? this.toDomain(row) : null;
  }

  async findByHandle(handle: string): Promise<Product | null> {
    const row = await this.prisma.product.findFirst({ where: { handle, deletedAt: null }, include: PRODUCT_INCLUDE });
    return row ? this.toDomain(row) : null;
  }

  async findAll(filter: ProductFilter): Promise<ProductPage> {
    const where: Prisma.ProductWhereInput = { deletedAt: null };

    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { handle: { contains: filter.search, mode: 'insensitive' } },
        { variants: { some: { sku: { contains: filter.search, mode: 'insensitive' } } } },
      ];
    }
    if (filter.status) {
      where.status = filter.status as ProductStatus;
    }
    if (filter.categoryId) {
      where.categories = { some: { categoryId: filter.categoryId } };
    }
    if (filter.collectionId) {
      where.collections = { some: { id: filter.collectionId } };
    }
    if (filter.salesChannelId) {
      where.salesChannels = { some: { id: filter.salesChannelId } };
    }

    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items: rows.map((row) => this.toDomain(row)), total, page, pageSize };
  }

  async findVariantBySku(sku: string): Promise<{ productId: string; variantId: string } | null> {
    // SKU es único parcial sobre filas activas (deleted_at IS NULL); usamos
    // findFirst para respetar esa semántica.
    const row = await this.prisma.productVariant.findFirst({
      where: { sku, deletedAt: null },
      select: { id: true, productId: true },
    });
    return row ? { productId: row.productId, variantId: row.id } : null;
  }

  async findVariantById(variantId: string): Promise<{ productId: string; variantId: string } | null> {
    const row = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true, productId: true },
    });
    return row ? { productId: row.productId, variantId: row.id } : null;
  }

  async create(product: Product, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.product.create({ data: this.toScalarRow(product) });

      for (const option of product.options) {
        await tx.productOption.create({
          data: {
            id: option.id,
            title: option.title,
            productId: product.id,
            metadata: this.toJson(option.metadata),
            values: {
              create: option.values.map((value) => ({
                id: value.id,
                value: value.value,
                metadata: this.toJson(value.metadata),
              })),
            },
          },
        });
      }

      for (const variant of product.variants) {
        await tx.productVariant.create({
          data: {
            ...this.variantToRow(variant),
            productId: product.id,
            options: { create: variant.optionValueIds.map((optionValueId) => ({ optionValueId })) },
          },
        });
        await this.syncVariantPrices(tx, variant);
      }

      if (product.specifications.length > 0) {
        await tx.productSpecification.createMany({
          data: product.specifications.map((specification) => ({
            id: specification.id,
            productId: product.id,
            name: specification.name,
            value: specification.value,
            rank: specification.rank,
          })),
        });
      }

      if (product.categoryIds.length > 0) {
        await tx.productCategoryProduct.createMany({
          data: product.categoryIds.map((categoryId) => ({ productId: product.id, categoryId })),
        });
      }

      await this.syncTaxonomyConnections(tx, product, 'connect');

      await recordActivity(tx, activity);
    });
  }

  async update(product: Product, activity: RecordActivityInput, redirect: SlugRedirect | null): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id: product.id }, data: this.toScalarRow(product) });

      await this.syncOptions(tx, product);
      await this.syncVariants(tx, product);
      await this.syncSpecifications(tx, product);
      await this.syncCategories(tx, product);
      await this.syncTaxonomyConnections(tx, product, 'set');

      if (redirect) {
        await tx.urlRedirect.create({
          data: { fromPath: redirect.fromPath, toPath: redirect.toPath, entityType: redirect.entityType },
        });
      }

      await recordActivity(tx, activity);
    });
  }

  async remove(product: Product, activity: RecordActivityInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id: product.id }, data: { deletedAt: new Date() } });
      await recordActivity(tx, activity);
    });
  }

  // ----- Sincronización de sub-entidades (update) -----

  private async syncOptions(tx: Prisma.TransactionClient, product: Product): Promise<void> {
    const existing = await tx.productOption.findMany({ where: { productId: product.id }, include: { values: true } });
    const incomingIds = new Set(product.options.map((option) => option.id));

    const toDelete = existing.filter((option) => !incomingIds.has(option.id));
    if (toDelete.length > 0) {
      await tx.productOption.deleteMany({ where: { id: { in: toDelete.map((option) => option.id) } } });
    }

    for (const option of product.options) {
      const current = existing.find((row) => row.id === option.id);
      if (!current) {
        await tx.productOption.create({
          data: {
            id: option.id,
            title: option.title,
            productId: product.id,
            metadata: this.toJson(option.metadata),
            values: {
              create: option.values.map((value) => ({
                id: value.id,
                value: value.value,
                metadata: this.toJson(value.metadata),
              })),
            },
          },
        });
        continue;
      }

      await tx.productOption.update({
        where: { id: option.id },
        data: { title: option.title, metadata: this.toJson(option.metadata) },
      });

      await this.syncOptionValues(tx, option, current.values);
    }
  }

  private async syncOptionValues(
    tx: Prisma.TransactionClient,
    option: ProductOptionProps,
    existingValues: { id: string }[],
  ): Promise<void> {
    const incomingIds = new Set(option.values.map((value) => value.id));
    const toDelete = existingValues.filter((value) => !incomingIds.has(value.id));
    if (toDelete.length > 0) {
      await tx.productOptionValue.deleteMany({ where: { id: { in: toDelete.map((value) => value.id) } } });
    }

    for (const value of option.values) {
      const exists = existingValues.some((row) => row.id === value.id);
      if (exists) {
        await tx.productOptionValue.update({
          where: { id: value.id },
          data: { value: value.value, metadata: this.toJson(value.metadata) },
        });
      } else {
        await tx.productOptionValue.create({
          data: { id: value.id, value: value.value, optionId: option.id, metadata: this.toJson(value.metadata) },
        });
      }
    }
  }

  private async syncVariants(tx: Prisma.TransactionClient, product: Product): Promise<void> {
    const existing = await tx.productVariant.findMany({ where: { productId: product.id }, include: { options: true } });
    const incomingIds = new Set(product.variants.map((variant) => variant.id));

    const toDelete = existing.filter((variant) => !incomingIds.has(variant.id));
    if (toDelete.length > 0) {
      await tx.productVariant.deleteMany({ where: { id: { in: toDelete.map((variant) => variant.id) } } });
    }

    for (const variant of product.variants) {
      const current = existing.find((row) => row.id === variant.id);
      if (!current) {
        await tx.productVariant.create({
          data: {
            ...this.variantToRow(variant),
            productId: product.id,
            options: { create: variant.optionValueIds.map((optionValueId) => ({ optionValueId })) },
          },
        });
        await this.syncVariantPrices(tx, variant);
        continue;
      }

      await tx.productVariant.update({ where: { id: variant.id }, data: this.variantToRow(variant) });

      const existingValueIds = new Set(current.options.map((option) => option.optionValueId));
      const incomingValueIds = new Set(variant.optionValueIds);

      const toRemove = [...existingValueIds].filter((id) => !incomingValueIds.has(id));
      if (toRemove.length > 0) {
        await tx.productVariantOption.deleteMany({
          where: { variantId: variant.id, optionValueId: { in: toRemove } },
        });
      }

      const toAdd = variant.optionValueIds.filter((id) => !existingValueIds.has(id));
      if (toAdd.length > 0) {
        await tx.productVariantOption.createMany({
          data: toAdd.map((optionValueId) => ({ variantId: variant.id, optionValueId })),
        });
      }

      await this.syncVariantPrices(tx, variant);
    }
  }

  /**
   * Sincroniza el precio base y los tier prices (propios, sin lista de
   * precios) de una variante. Crea el `PriceSet` de forma perezosa, la
   * primera vez que la variante recibe un precio.
   */
  private async syncVariantPrices(tx: Prisma.TransactionClient, variant: ProductVariantProps): Promise<void> {
    let priceSet = await tx.priceSet.findUnique({ where: { variantId: variant.id }, include: { prices: true } });
    if (!priceSet) {
      if (variant.prices.length === 0) {
        return;
      }
      priceSet = await tx.priceSet.create({ data: { variantId: variant.id }, include: { prices: true } });
    }

    const existing = priceSet.prices.filter((price) => price.priceListId === null);
    const incomingIds = new Set(variant.prices.map((price) => price.id));

    const toDelete = existing.filter((price) => !incomingIds.has(price.id));
    if (toDelete.length > 0) {
      await tx.price.deleteMany({ where: { id: { in: toDelete.map((price) => price.id) } } });
    }

    for (const price of variant.prices) {
      const current = existing.find((row) => row.id === price.id);
      const data = {
        currencyCode: price.currencyCode,
        amount: price.amount,
        minQuantity: price.minQuantity,
        maxQuantity: price.maxQuantity,
      };
      if (current) {
        await tx.price.update({ where: { id: price.id }, data });
      } else {
        await tx.price.create({ data: { id: price.id, priceSetId: priceSet.id, ...data } });
      }
    }
  }

  private async syncSpecifications(tx: Prisma.TransactionClient, product: Product): Promise<void> {
    const existing = await tx.productSpecification.findMany({ where: { productId: product.id }, select: { id: true } });
    const incomingIds = new Set(product.specifications.map((specification) => specification.id));

    const toDelete = existing.filter((specification) => !incomingIds.has(specification.id));
    if (toDelete.length > 0) {
      await tx.productSpecification.deleteMany({ where: { id: { in: toDelete.map((specification) => specification.id) } } });
    }

    for (const specification of product.specifications) {
      const exists = existing.some((row) => row.id === specification.id);
      if (exists) {
        await tx.productSpecification.update({
          where: { id: specification.id },
          data: { name: specification.name, value: specification.value, rank: specification.rank },
        });
      } else {
        await this.createSpecification(tx, product.id, specification);
      }
    }
  }

  private async createSpecification(
    tx: Prisma.TransactionClient,
    productId: string,
    specification: ProductSpecificationProps,
  ): Promise<void> {
    await tx.productSpecification.create({
      data: { id: specification.id, productId, name: specification.name, value: specification.value, rank: specification.rank },
    });
  }

  private async syncCategories(tx: Prisma.TransactionClient, product: Product): Promise<void> {
    const existing = await tx.productCategoryProduct.findMany({ where: { productId: product.id }, select: { categoryId: true } });
    const existingIds = new Set(existing.map((row) => row.categoryId));
    const incomingIds = new Set(product.categoryIds);

    const toRemove = [...existingIds].filter((id) => !incomingIds.has(id));
    if (toRemove.length > 0) {
      await tx.productCategoryProduct.deleteMany({ where: { productId: product.id, categoryId: { in: toRemove } } });
    }

    const toAdd = product.categoryIds.filter((id) => !existingIds.has(id));
    if (toAdd.length > 0) {
      await tx.productCategoryProduct.createMany({ data: toAdd.map((categoryId) => ({ productId: product.id, categoryId })) });
    }
  }

  private async syncTaxonomyConnections(tx: Prisma.TransactionClient, product: Product, mode: 'connect' | 'set'): Promise<void> {
    const collections = product.collectionIds.map((id) => ({ id }));
    const tags = product.tagIds.map((id) => ({ id }));
    const salesChannels = product.salesChannelIds.map((id) => ({ id }));

    if (mode === 'connect' && collections.length === 0 && tags.length === 0 && salesChannels.length === 0) {
      return;
    }

    await tx.product.update({
      where: { id: product.id },
      data: {
        collections: { [mode]: collections },
        tags: { [mode]: tags },
        salesChannels: { [mode]: salesChannels },
      },
    });
  }

  // ----- Mapeo a filas Prisma -----

  private toScalarRow(product: Product) {
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
      metadata: this.toJson(product.metadata),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private variantToRow(variant: ProductVariantProps) {
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
      saleStartsAt: variant.saleStartsAt,
      saleEndsAt: variant.saleEndsAt,
      weight: variant.weight,
      length: variant.length,
      height: variant.height,
      width: variant.width,
      variantRank: variant.variantRank,
      metadata: this.toJson(variant.metadata),
    };
  }

  private toJson(value: Record<string, unknown> | null): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
  }

  private toDomain(row: ProductRow): Product {
    const options: ProductOptionProps[] = row.options.map((option) => ({
      id: option.id,
      title: option.title,
      metadata: option.metadata as Record<string, unknown> | null,
      values: option.values.map((value) => ({
        id: value.id,
        value: value.value,
        metadata: value.metadata as Record<string, unknown> | null,
      })),
    }));

    const variants: ProductVariantProps[] = row.variants.map((variant) => ({
      id: variant.id,
      title: variant.title,
      sku: variant.sku,
      barcode: variant.barcode,
      ean: variant.ean,
      upc: variant.upc,
      allowBackorder: variant.allowBackorder,
      manageInventory: variant.manageInventory,
      lowStockThreshold: variant.lowStockThreshold,
      cost: variant.cost ? Number(variant.cost) : null,
      salePrice: variant.salePrice ? Number(variant.salePrice) : null,
      saleStartsAt: variant.saleStartsAt,
      saleEndsAt: variant.saleEndsAt,
      weight: variant.weight,
      length: variant.length,
      height: variant.height,
      width: variant.width,
      variantRank: variant.variantRank ?? 0,
      optionValueIds: variant.options.map((option) => option.optionValueId),
      prices: (variant.priceSet?.prices ?? [])
        .filter((price) => price.priceListId === null)
        .map((price): VariantPriceProps => ({
          id: price.id,
          currencyCode: price.currencyCode,
          amount: Number(price.amount),
          minQuantity: price.minQuantity,
          maxQuantity: price.maxQuantity,
        })),
      metadata: variant.metadata as Record<string, unknown> | null,
    }));

    const specifications: ProductSpecificationProps[] = row.specifications.map((specification) => ({
      id: specification.id,
      name: specification.name,
      value: specification.value,
      rank: specification.rank,
    }));

    return Product.rehydrate(
      {
        title: row.title,
        handle: row.handle,
        subtitle: row.subtitle,
        description: row.description,
        status: row.status as ProductStatus,
        thumbnail: row.thumbnail,
        isGiftcard: row.isGiftcard,
        discountable: row.discountable,
        weight: row.weight,
        length: row.length,
        height: row.height,
        width: row.width,
        material: row.material,
        metaTitle: row.metaTitle,
        metaDescription: row.metaDescription,
        typeId: row.typeId,
        brandId: row.brandId,
        externalId: row.externalId,
        metadata: row.metadata as Record<string, unknown> | null,
        categoryIds: row.categories.map((category) => category.categoryId),
        collectionIds: row.collections.map((collection) => collection.id),
        tagIds: row.tags.map((tag) => tag.id),
        salesChannelIds: row.salesChannels.map((channel) => channel.id),
        options,
        variants,
        specifications,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      row.id,
    );
  }
}
