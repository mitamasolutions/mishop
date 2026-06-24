import { Entity } from '@mitama/core';
import type { VariantSnapshot } from './catalog-snapshot';

export type CartChannel = 'web' | 'pos';
export type CheckoutStep = 'cart' | 'address' | 'shipping' | 'payment' | 'confirmation';

export interface CartAddressSnapshot {
  firstName: string;
  lastName: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  province: string | null;
  postalCode: string | null;
  countryCode: string;
}

export interface CartShippingMethodSnapshot {
  id: string;
  name: string;
  amount: number;
}

export interface CartPaymentMethodSnapshot {
  provider: string;
  method: string;
}

export interface CartLineProps {
  id: string;
  variantId: string;
  productId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  quantity: number;
  currencyCode: string;
  capturedUnitPrice: number;
  currentUnitPrice: number;
  priceChangeConfirmed: boolean;
  availableStock: number;
  stockLocationId: string;
  stockValid: boolean;
  warning: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CartProps {
  storeId: string;
  channel: CartChannel;
  token: string;
  customerId: string | null;
  status: 'active' | 'expired' | 'ordered';
  checkoutStep: CheckoutStep;
  shippingAddress: CartAddressSnapshot | null;
  billingAddress: CartAddressSnapshot | null;
  shippingMethod: CartShippingMethodSnapshot | null;
  paymentMethod: CartPaymentMethodSnapshot | null;
  lines: CartLineProps[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export class Cart extends Entity<CartProps> {
  static create(props: { storeId: string; channel: CartChannel; token?: string; customerId?: string | null; expiresAt: Date }): Cart {
    const now = new Date();
    return new Cart(crypto.randomUUID(), {
      storeId: props.storeId,
      channel: props.channel,
      token: props.token ?? crypto.randomUUID(),
      customerId: props.customerId ?? null,
      status: 'active',
      checkoutStep: 'cart',
      shippingAddress: null,
      billingAddress: null,
      shippingMethod: null,
      paymentMethod: null,
      lines: [],
      createdAt: now,
      updatedAt: now,
      expiresAt: props.expiresAt,
    });
  }

  static rehydrate(props: CartProps, id: string): Cart {
    return new Cart(id, props);
  }

  get storeId(): string { return this.props.storeId; }
  get channel(): CartChannel { return this.props.channel; }
  get token(): string { return this.props.token; }
  get customerId(): string | null { return this.props.customerId; }
  get status(): 'active' | 'expired' | 'ordered' { return this.props.status; }
  get checkoutStep(): CheckoutStep { return this.props.checkoutStep; }
  get shippingAddress(): CartAddressSnapshot | null { return this.props.shippingAddress ? { ...this.props.shippingAddress } : null; }
  get billingAddress(): CartAddressSnapshot | null { return this.props.billingAddress ? { ...this.props.billingAddress } : null; }
  get shippingMethod(): CartShippingMethodSnapshot | null { return this.props.shippingMethod ? { ...this.props.shippingMethod } : null; }
  get paymentMethod(): CartPaymentMethodSnapshot | null { return this.props.paymentMethod ? { ...this.props.paymentMethod } : null; }
  get lines(): CartLineProps[] { return this.props.lines.map((line) => ({ ...line })); }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get expiresAt(): Date { return this.props.expiresAt; }

  addOrUpdateLine(snapshot: VariantSnapshot, quantity: number): void {
    const existing = this.props.lines.find((line) => line.variantId === snapshot.variantId);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + quantity, snapshot.availableStock);
      this.applySnapshot(existing, snapshot, false);
    } else {
      const now = new Date();
      const line: CartLineProps = {
        id: crypto.randomUUID(),
        variantId: snapshot.variantId,
        productId: snapshot.productId,
        productTitle: snapshot.productTitle,
        variantTitle: snapshot.variantTitle,
        sku: snapshot.sku,
        quantity: Math.min(quantity, snapshot.availableStock),
        currencyCode: snapshot.currencyCode,
        capturedUnitPrice: snapshot.unitPrice,
        currentUnitPrice: snapshot.unitPrice,
        priceChangeConfirmed: true,
        availableStock: snapshot.availableStock,
        stockLocationId: snapshot.locationId,
        stockValid: snapshot.availableStock >= quantity && quantity > 0,
        warning: snapshot.availableStock >= quantity ? null : 'Stock insuficiente; cantidad ajustada',
        createdAt: now,
        updatedAt: now,
      };
      this.props.lines.push(line);
    }
    this.touch();
  }

  refreshLine(snapshot: VariantSnapshot): void {
    const line = this.props.lines.find((candidate) => candidate.variantId === snapshot.variantId);
    if (!line) return;
    this.applySnapshot(line, snapshot, true);
    this.touch();
  }

  confirmPriceChanges(): void {
    for (const line of this.props.lines) {
      line.capturedUnitPrice = line.currentUnitPrice;
      line.priceChangeConfirmed = true;
      line.warning = line.stockValid ? null : line.warning;
      line.updatedAt = new Date();
    }
    this.touch();
  }

  setAddresses(input: { shippingAddress: CartAddressSnapshot; billingAddress: CartAddressSnapshot }): void {
    this.props.shippingAddress = input.shippingAddress;
    this.props.billingAddress = input.billingAddress;
    this.props.checkoutStep = 'address';
    this.touch();
  }

  setShippingMethod(method: CartShippingMethodSnapshot): void {
    this.props.shippingMethod = method;
    this.props.checkoutStep = 'shipping';
    this.touch();
  }

  setPaymentMethod(method: CartPaymentMethodSnapshot): void {
    this.props.paymentMethod = method;
    this.props.checkoutStep = 'payment';
    this.touch();
  }

  moveToConfirmation(): void {
    this.props.checkoutStep = 'confirmation';
    this.touch();
  }

  attachCustomer(customerId: string): void {
    this.props.customerId = customerId;
    this.touch();
  }

  markOrdered(): void {
    this.props.status = 'ordered';
    this.touch();
  }

  expire(): void {
    this.props.status = 'expired';
    this.touch();
  }

  canCheckout(): boolean {
    return this.props.lines.length > 0 && this.props.lines.every((line) => line.stockValid && line.priceChangeConfirmed);
  }

  totals(): { currencyCode: string | null; subtotal: number; shipping: number; total: number } {
    const subtotal = this.props.lines.reduce((sum, line) => sum + line.currentUnitPrice * line.quantity, 0);
    const shipping = this.props.shippingMethod?.amount ?? 0;
    return { currencyCode: this.props.lines[0]?.currencyCode ?? null, subtotal, shipping, total: subtotal + shipping };
  }

  private applySnapshot(line: CartLineProps, snapshot: VariantSnapshot, requireConfirmation: boolean): void {
    line.productId = snapshot.productId;
    line.productTitle = snapshot.productTitle;
    line.variantTitle = snapshot.variantTitle;
    line.sku = snapshot.sku;
    line.currencyCode = snapshot.currencyCode;
    if (snapshot.unitPrice !== line.currentUnitPrice) {
      line.currentUnitPrice = snapshot.unitPrice;
      line.priceChangeConfirmed = !requireConfirmation;
      line.warning = 'El precio cambió y requiere confirmación';
    }
    line.availableStock = snapshot.availableStock;
    line.stockLocationId = snapshot.locationId;
    if (snapshot.availableStock < line.quantity) {
      line.quantity = Math.max(0, snapshot.availableStock);
      line.stockValid = line.quantity > 0;
      line.warning = line.quantity > 0 ? 'Stock insuficiente; cantidad ajustada' : 'Sin stock disponible';
    } else {
      line.stockValid = line.quantity > 0;
    }
    line.updatedAt = new Date();
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}
