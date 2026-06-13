import { err, ok, Result, UseCase } from '@mitama/core';
import { Cart, type CartAddressSnapshot, type CartChannel, type CartPaymentMethodSnapshot, type CartShippingMethodSnapshot } from '../domain/cart.entity';
import type { CartRepository } from '../domain/cart.repository';
import type { CatalogSnapshotService } from '../domain/catalog-snapshot';
import {
  CartHasInvalidStockError,
  CartHasUnconfirmedPriceChangesError,
  CartNotFoundError,
  CartStoreChannelMismatchError,
  InvalidCheckoutStepError,
} from '../domain/errors';
import { toCartOutput, type CartOutput } from './cart.dto';

const DEFAULT_EXPIRATION_DAYS = 30;

export interface CartIdentityInput {
  storeId: string;
  channel: CartChannel;
  token?: string | null;
  customerId?: string | null;
}

export class GetOrCreateCartUseCase implements UseCase<CartIdentityInput, Result<CartOutput, never>> {
  constructor(private readonly carts: CartRepository) {}

  async execute(input: CartIdentityInput): Promise<Result<CartOutput, never>> {
    const existing = input.customerId
      ? await this.carts.findActiveByCustomer(input.customerId, input.storeId, input.channel)
      : input.token
        ? await this.carts.findActiveByToken(input.token, input.storeId, input.channel)
        : null;

    if (existing) return ok(toCartOutput(existing));

    const cart = Cart.create({
      storeId: input.storeId,
      channel: input.channel,
      token: input.token ?? undefined,
      customerId: input.customerId ?? null,
      expiresAt: expiresAt(),
    });
    await this.carts.save(cart);
    return ok(toCartOutput(cart));
  }
}

export interface AddCartLineInput extends CartIdentityInput {
  variantId: string;
  quantity: number;
}

export class AddCartLineUseCase implements UseCase<AddCartLineInput, Result<CartOutput, CartStoreChannelMismatchError>> {
  constructor(
    private readonly carts: CartRepository,
    private readonly catalog: CatalogSnapshotService,
  ) {}

  async execute(input: AddCartLineInput): Promise<Result<CartOutput, CartStoreChannelMismatchError>> {
    const getOrCreate = new GetOrCreateCartUseCase(this.carts);
    const cartResult = await getOrCreate.execute(input);
    if (cartResult.isErr()) throw new Error('Resultado imposible al crear carrito');
    const cartOutput = cartResult.value;
    const cart = await this.carts.findById(cartOutput.id);
    if (!cart || cart.storeId !== input.storeId || cart.channel !== input.channel) return err(new CartStoreChannelMismatchError());

    const snapshot = await this.catalog.getVariant({
      storeId: input.storeId,
      channel: input.channel,
      variantId: input.variantId,
      quantity: input.quantity,
    });
    if (!snapshot) return ok(toCartOutput(cart));

    cart.addOrUpdateLine(snapshot, input.quantity);
    await this.carts.save(cart);
    return ok(toCartOutput(cart));
  }
}

export class RefreshCartUseCase implements UseCase<string, Result<CartOutput, CartNotFoundError>> {
  constructor(
    private readonly carts: CartRepository,
    private readonly catalog: CatalogSnapshotService,
  ) {}

  async execute(cartId: string): Promise<Result<CartOutput, CartNotFoundError>> {
    const cart = await this.carts.findById(cartId);
    if (!cart) return err(new CartNotFoundError(cartId));
    for (const line of cart.lines) {
      const snapshot = await this.catalog.getVariant({ storeId: cart.storeId, channel: cart.channel, variantId: line.variantId, quantity: line.quantity });
      if (snapshot) cart.refreshLine(snapshot);
    }
    await this.carts.save(cart);
    return ok(toCartOutput(cart));
  }
}

export class ConfirmCartPriceChangesUseCase implements UseCase<string, Result<CartOutput, CartNotFoundError>> {
  constructor(private readonly carts: CartRepository) {}

  async execute(cartId: string): Promise<Result<CartOutput, CartNotFoundError>> {
    const cart = await this.carts.findById(cartId);
    if (!cart) return err(new CartNotFoundError(cartId));
    cart.confirmPriceChanges();
    await this.carts.save(cart);
    return ok(toCartOutput(cart));
  }
}

export type CheckoutInput =
  | { action: 'addresses'; cartId: string; shippingAddress: CartAddressSnapshot; billingAddress: CartAddressSnapshot }
  | { action: 'shipping'; cartId: string; shippingMethod: CartShippingMethodSnapshot }
  | { action: 'payment'; cartId: string; paymentMethod: CartPaymentMethodSnapshot }
  | { action: 'confirmation'; cartId: string };

export type CheckoutError = CartNotFoundError | CartHasUnconfirmedPriceChangesError | CartHasInvalidStockError | InvalidCheckoutStepError;

export class AdvanceCheckoutUseCase implements UseCase<CheckoutInput, Result<CartOutput, CheckoutError>> {
  constructor(private readonly carts: CartRepository) {}

  async execute(input: CheckoutInput): Promise<Result<CartOutput, CheckoutError>> {
    const cart = await this.carts.findById(input.cartId);
    if (!cart) return err(new CartNotFoundError(input.cartId));

    if (input.action === 'addresses') {
      cart.setAddresses({ shippingAddress: input.shippingAddress, billingAddress: input.billingAddress });
    } else if (input.action === 'shipping') {
      if (!cart.shippingAddress || !cart.billingAddress) return err(new InvalidCheckoutStepError());
      cart.setShippingMethod(input.shippingMethod);
    } else if (input.action === 'payment') {
      if (!cart.shippingMethod) return err(new InvalidCheckoutStepError());
      if (cart.lines.some((line) => !line.priceChangeConfirmed)) return err(new CartHasUnconfirmedPriceChangesError());
      if (cart.lines.some((line) => !line.stockValid)) return err(new CartHasInvalidStockError());
      cart.setPaymentMethod(input.paymentMethod);
    } else {
      if (!cart.paymentMethod || !cart.canCheckout()) return err(new InvalidCheckoutStepError());
      cart.moveToConfirmation();
    }

    await this.carts.save(cart);
    return ok(toCartOutput(cart));
  }
}

export interface MergeCartInput {
  storeId: string;
  channel: CartChannel;
  guestToken: string;
  customerId: string;
}

export class MergeGuestCartUseCase implements UseCase<MergeCartInput, Result<CartOutput, never>> {
  constructor(
    private readonly carts: CartRepository,
    private readonly catalog: CatalogSnapshotService,
  ) {}

  async execute(input: MergeCartInput): Promise<Result<CartOutput, never>> {
    const guest = await this.carts.findActiveByToken(input.guestToken, input.storeId, input.channel);
    const customer =
      (await this.carts.findActiveByCustomer(input.customerId, input.storeId, input.channel)) ??
      Cart.create({ storeId: input.storeId, channel: input.channel, customerId: input.customerId, expiresAt: expiresAt() });

    if (guest) {
      for (const line of guest.lines) {
        const snapshot = await this.catalog.getVariant({ storeId: input.storeId, channel: input.channel, variantId: line.variantId, quantity: line.quantity });
        if (snapshot) customer.addOrUpdateLine(snapshot, line.quantity);
      }
      guest.expire();
      await this.carts.save(guest);
    }

    customer.attachCustomer(input.customerId);
    await this.carts.save(customer);
    return ok(toCartOutput(customer));
  }
}

export class PurgeExpiredCartsUseCase implements UseCase<Date | undefined, Result<number, never>> {
  constructor(private readonly carts: CartRepository) {}

  async execute(now = new Date()): Promise<Result<number, never>> {
    const expired = await this.carts.findExpired(now);
    for (const cart of expired) await this.carts.delete(cart.id);
    return ok(expired.length);
  }
}

function expiresAt(): Date {
  return new Date(Date.now() + DEFAULT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
}
