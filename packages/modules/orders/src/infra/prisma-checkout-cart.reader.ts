import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/db';
import type { CheckoutCartReader, CheckoutCartSnapshot } from '../domain/checkout-cart';

@Injectable()
export class PrismaCheckoutCartReader implements CheckoutCartReader {
  constructor(private readonly prisma: PrismaService) {}

  async getReadyCart(cartId: string): Promise<CheckoutCartSnapshot | null> {
    const cart = await this.prisma.cart.findUnique({ where: { id: cartId }, include: { lines: true } });
    if (!cart || cart.status !== 'active' || cart.checkoutStep !== 'confirmation' || !cart.customerId) return null;
    if (cart.expiresAt <= new Date()) return null;
    if (!cart.shippingAddress || !cart.billingAddress || !cart.shippingMethod || !cart.paymentMethod) return null;
    if (cart.lines.length === 0) return null;
    if (cart.lines.some((line) => !line.stockValid || !line.priceChangeConfirmed)) return null;

    // Configuración fiscal de la tienda: imprescindible para el cálculo
    // server-side de impuestos (r13 · sprint1_cierre).
    const taxSetting = await this.prisma.storeTaxSetting.findUnique({ where: { storeId: cart.storeId } });
    if (!taxSetting) return null;

    // Validación server-side: las variantes existen, el producto está
    // publicado y el precio actual coincide con el capturado en el carrito.
    // El cliente no puede manipular precios al confirmar. Además se captura
    // categoría fiscal y peso para el recálculo server-side.
    const enrichedLines: Array<{ cartLineId: string; taxCategory: string | null; weightKg: number }> = [];
    for (const line of cart.lines) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: line.variantId },
        include: {
          product: { select: { status: true, deletedAt: true, taxCategory: true, weight: true, salesChannels: true } },
          priceSet: { include: { prices: true } },
        },
      });
      if (!variant || variant.deletedAt) return null;
      if (!variant.product || variant.product.deletedAt || variant.product.status !== 'published') return null;
      if (!productIsVisibleInChannel(variant.product.salesChannels, cart.channel)) return null;

      const currentPrice = pickCurrentPrice(variant.priceSet?.prices ?? [], line.currencyCode, line.quantity);
      if (currentPrice === null) return null;
      if (Math.abs(currentPrice - Number(line.currentUnitPrice)) > 0.001) return null;

      // Categoría fiscal: variante manda, cae a producto, cae a null
      // (el resolver aplicará `standard` con advertencia).
      const taxCategory = variant.taxCategory ?? variant.product.taxCategory ?? null;
      // Peso: variante manda, cae a producto, cae a 0.
      const weightKg = variant.weight ?? variant.product.weight ?? 0;

      enrichedLines.push({ cartLineId: line.id, taxCategory, weightKg });
    }

    const customer = await this.prisma.customer.findUnique({ where: { id: cart.customerId }, select: { email: true } });
    const byCartLineId = new Map(enrichedLines.map((entry) => [entry.cartLineId, entry]));

    return {
      id: cart.id,
      storeId: cart.storeId,
      regionId: taxSetting.regionId,
      pricesIncludeTax: taxSetting.pricesIncludeTax,
      channel: cart.channel as 'web' | 'pos',
      customerId: cart.customerId,
      email: customer?.email ?? null,
      shippingAddress: cart.shippingAddress as Record<string, unknown>,
      billingAddress: cart.billingAddress as Record<string, unknown>,
      shippingMethod: cart.shippingMethod as { id: string; name: string; amount: number },
      paymentMethod: cart.paymentMethod as { provider: string; method: string },
      lines: cart.lines.map((line) => {
        const enriched = byCartLineId.get(line.id);
        return {
          cartLineId: line.id,
          variantId: line.variantId,
          productId: line.productId,
          productTitle: line.productTitle,
          variantTitle: line.variantTitle,
          sku: line.sku,
          quantity: line.quantity,
          currencyCode: line.currencyCode,
          unitPrice: Number(line.currentUnitPrice),
          stockLocationId: line.stockLocationId,
          taxCategory: enriched?.taxCategory ?? null,
          weightKg: enriched?.weightKg ?? 0,
        };
      }),
    };
  }

  async getCartStoreId(cartId: string): Promise<string | null> {
    const cart = await this.prisma.cart.findUnique({ where: { id: cartId }, select: { storeId: true } });
    return cart?.storeId ?? null;
  }

  async markOrdered(cartId: string): Promise<void> {
    await this.prisma.cart.update({ where: { id: cartId }, data: { status: 'ordered' } });
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

/**
 * Elige el precio base para `(currency, quantity)`: el más específico que
 * cumpla el rango de cantidad y, ante empate, el de menor monto.
 */
function pickCurrentPrice(prices: Array<{ currencyCode: string; amount: unknown; minQuantity: number | null; maxQuantity: number | null }>, currencyCode: string, quantity: number): number | null {
  const candidates = prices
    .filter((price) => price.currencyCode === currencyCode)
    .filter((price) => (price.minQuantity ?? 1) <= quantity && (price.maxQuantity ?? Number.POSITIVE_INFINITY) >= quantity)
    .map((price) => Number(price.amount))
    .filter((amount) => Number.isFinite(amount));
  if (candidates.length === 0) return null;
  return Math.min(...candidates);
}
