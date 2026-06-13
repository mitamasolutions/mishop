import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/db';
import type { CheckoutCartReader, CheckoutCartSnapshot } from '../domain/checkout-cart';

@Injectable()
export class PrismaCheckoutCartReader implements CheckoutCartReader {
  constructor(private readonly prisma: PrismaService) {}

  async getReadyCart(cartId: string): Promise<CheckoutCartSnapshot | null> {
    const cart = await this.prisma.cart.findUnique({ where: { id: cartId }, include: { lines: true } });
    if (!cart || cart.status !== 'active' || cart.checkoutStep !== 'confirmation' || !cart.customerId) return null;
    if (!cart.shippingAddress || !cart.billingAddress || !cart.shippingMethod || !cart.paymentMethod) return null;
    if (cart.lines.some((line) => !line.stockValid || !line.priceChangeConfirmed)) return null;

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

  async markOrdered(cartId: string): Promise<void> {
    await this.prisma.cart.update({ where: { id: cartId }, data: { status: 'ordered' } });
  }
}
