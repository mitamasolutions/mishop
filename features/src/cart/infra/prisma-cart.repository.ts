import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@mitama/data';
import { Cart, type CartAddressSnapshot, type CartChannel, type CartLineProps, type CartPaymentMethodSnapshot, type CartShippingMethodSnapshot, type CheckoutStep } from '../domain/cart.entity';
import type { CartRepository } from '../domain/cart.repository';

const CART_INCLUDE = { lines: true } satisfies Prisma.CartInclude;
type CartRow = Prisma.CartGetPayload<{ include: typeof CART_INCLUDE }>;

@Injectable()
export class PrismaCartRepository implements CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Cart | null> {
    const row = await this.prisma.cart.findUnique({ where: { id }, include: CART_INCLUDE });
    return row ? this.toDomain(row) : null;
  }

  async findActiveByToken(token: string, storeId: string, channel: string): Promise<Cart | null> {
    const row = await this.prisma.cart.findFirst({ where: { token, storeId, channel, status: 'active' }, include: CART_INCLUDE });
    return row ? this.toDomain(row) : null;
  }

  async findActiveByCustomer(customerId: string, storeId: string, channel: string): Promise<Cart | null> {
    const row = await this.prisma.cart.findFirst({ where: { customerId, storeId, channel, status: 'active' }, include: CART_INCLUDE });
    return row ? this.toDomain(row) : null;
  }

  async findExpired(now: Date): Promise<Cart[]> {
    const rows = await this.prisma.cart.findMany({ where: { status: 'active', expiresAt: { lte: now } }, include: CART_INCLUDE });
    return rows.map((row) => this.toDomain(row));
  }

  async save(cart: Cart): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.cart.upsert({ where: { id: cart.id }, create: this.toCartRow(cart), update: this.toCartRow(cart) });
      await tx.cartLine.deleteMany({ where: { cartId: cart.id } });
      if (cart.lines.length > 0) {
        await tx.cartLine.createMany({ data: cart.lines.map((line) => this.toLineRow(cart.id, line)) });
      }
    });
  }

  async delete(cartId: string): Promise<void> {
    await this.prisma.cart.delete({ where: { id: cartId } });
  }

  private toCartRow(cart: Cart): Prisma.CartUncheckedCreateInput {
    return {
      id: cart.id,
      storeId: cart.storeId,
      channel: cart.channel,
      token: cart.token,
      customerId: cart.customerId,
      status: cart.status,
      checkoutStep: cart.checkoutStep,
      shippingAddress: this.toJson(cart.shippingAddress),
      billingAddress: this.toJson(cart.billingAddress),
      shippingMethod: this.toJson(cart.shippingMethod),
      paymentMethod: this.toJson(cart.paymentMethod),
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      expiresAt: cart.expiresAt,
    };
  }

  private toLineRow(cartId: string, line: CartLineProps): Prisma.CartLineUncheckedCreateInput {
    return { cartId, ...line };
  }

  private toDomain(row: CartRow): Cart {
    return Cart.rehydrate(
      {
        storeId: row.storeId,
        channel: row.channel as CartChannel,
        token: row.token,
        customerId: row.customerId,
        status: row.status as 'active' | 'expired' | 'ordered',
        checkoutStep: row.checkoutStep as CheckoutStep,
        shippingAddress: this.fromJson<CartAddressSnapshot>(row.shippingAddress),
        billingAddress: this.fromJson<CartAddressSnapshot>(row.billingAddress),
        shippingMethod: this.fromJson<CartShippingMethodSnapshot>(row.shippingMethod),
        paymentMethod: this.fromJson<CartPaymentMethodSnapshot>(row.paymentMethod),
        lines: row.lines.map((line) => ({
          id: line.id,
          variantId: line.variantId,
          productId: line.productId,
          productTitle: line.productTitle,
          variantTitle: line.variantTitle,
          sku: line.sku,
          quantity: line.quantity,
          currencyCode: line.currencyCode,
          capturedUnitPrice: Number(line.capturedUnitPrice),
          currentUnitPrice: Number(line.currentUnitPrice),
          priceChangeConfirmed: line.priceChangeConfirmed,
          availableStock: line.availableStock,
          stockLocationId: line.stockLocationId,
          stockValid: line.stockValid,
          warning: line.warning,
          createdAt: line.createdAt,
          updatedAt: line.updatedAt,
        })),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        expiresAt: row.expiresAt,
      },
      row.id,
    );
  }

  private toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
  }

  private fromJson<T>(value: Prisma.JsonValue): T | null {
    return value === null ? null : (value as T);
  }
}
