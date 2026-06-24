import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/data';
import type { CatalogSnapshotService, VariantSnapshot } from '../domain/catalog-snapshot';

@Injectable()
export class PrismaCatalogSnapshotService implements CatalogSnapshotService {
  constructor(private readonly prisma: PrismaService) {}

  async getVariant(input: { storeId: string; channel: string; variantId: string; quantity: number }): Promise<VariantSnapshot | null> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: input.variantId },
      include: {
        product: { include: { salesChannels: true } },
        priceSet: { include: { prices: true } },
        inventoryLink: { include: { inventoryItem: { include: { levels: true } } } },
      },
    });

    if (!variant || variant.deletedAt || variant.product.deletedAt) return null;
    if (variant.product.status !== 'published') return null;
    if (!productIsVisibleInChannel(variant.product.salesChannels, input.channel)) return null;

    const price = variant.priceSet?.prices.find((candidate) => candidate.minQuantity === null) ?? variant.priceSet?.prices[0];
    const level = variant.inventoryLink?.inventoryItem.levels[0] ?? null;
    const stocked = level ? Number(level.stockedQuantity) : 0;
    const reserved = level ? Number(level.reservedQuantity) : 0;
    const availableStock = variant.manageInventory ? Math.max(0, stocked - reserved) : Number.MAX_SAFE_INTEGER;

    return {
      variantId: variant.id,
      productId: variant.productId,
      productTitle: variant.product.title,
      variantTitle: variant.title,
      sku: variant.sku,
      currencyCode: price?.currencyCode ?? 'USD',
      unitPrice: price ? Number(price.amount) : 0,
      availableStock,
      locationId: level?.locationId ?? 'default',
    };
  }
}

function productIsVisibleInChannel(
  channels: Array<{ id: string; name: string; isActive: boolean; deletedAt: Date | null }>,
  cartChannel: string,
): boolean {
  return channels.some(
    (channel) =>
      channel.isActive &&
      !channel.deletedAt &&
      (channel.id === cartChannel || channel.name.toLowerCase() === cartChannel.toLowerCase()),
  );
}
