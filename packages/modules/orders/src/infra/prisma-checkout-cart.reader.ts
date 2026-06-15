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

    // Validación server-side: las variantes existen, el producto está
    // publicado y el precio actual coincide con el capturado en el carrito.
    // El cliente no puede manipular precios al confirmar.
    for (const line of cart.lines) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: line.variantId },
        include: { product: { select: { status: true, deletedAt: true } }, priceSet: { include: { prices: true } } },
      });
      if (!variant || variant.deletedAt) return null;
      if (!variant.product || variant.product.deletedAt || variant.product.status !== 'published') return null;

      const currentPrice = pickCurrentPrice(variant.priceSet?.prices ?? [], line.currencyCode, line.quantity);
      if (currentPrice === null) return null;
      if (Math.abs(currentPrice - Number(line.currentUnitPrice)) > 0.001) return null;
    }

    const customer = await this.prisma.customer.findUnique({ where: { id: cart.customerId }, select: { email: true } });

    return {
      id: cart.id,
      storeId: cart.storeId,
      channel: cart.channel as 'web' | 'pos',
      customerId: cart.customerId,
      email: customer?.email ?? null,
      shippingAddress: cart.shippingAddress as Record<string, unknown>,
      billingAddress: cart.billingAddress as Record<string, unknown>,
      shippingMethod: cart.shippingMethod as { id: string; name: string; amount: number },
      paymentMethod: cart.paymentMethod as { provider: string; method: string },
      lines: cart.lines.map((line) => ({
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
      })),
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
