import { describe, expect, it } from 'vitest';
import { InMemoryCatalogSnapshotService } from '../infra/in-memory-catalog-snapshot.service';
import { InMemoryCartRepository } from '../infra/in-memory-cart.repository';
import { InMemoryCustomerDirectory } from '../infra/in-memory-customer-directory';
import { AddCartLineUseCase, AdvanceCheckoutUseCase, ConfirmCartPriceChangesUseCase, IdentifyCheckoutCustomerUseCase, MergeGuestCartUseCase, RefreshCartUseCase } from './cart-use-cases';

describe('cart use cases', () => {
  it('detecta cambio de precio y bloquea pago hasta confirmar', async () => {
    const carts = new InMemoryCartRepository();
    const catalog = new InMemoryCatalogSnapshotService();
    catalog.variants.set('v1', variant({ unitPrice: 10, availableStock: 5 }));

    const add = new AddCartLineUseCase(carts, catalog);
    const refresh = new RefreshCartUseCase(carts, catalog);
    const checkout = new AdvanceCheckoutUseCase(carts);
    const confirm = new ConfirmCartPriceChangesUseCase(carts);

    const cart = (await add.execute({ storeId: 'store-1', channel: 'web', token: 'guest', variantId: 'v1', quantity: 1 })).value;
    catalog.variants.set('v1', variant({ unitPrice: 12, availableStock: 5 }));
    const refreshed = (await refresh.execute(cart.id)).value;
    expect(refreshed.lines[0]?.priceChangeConfirmed).toBe(false);

    await checkout.execute({ action: 'addresses', cartId: cart.id, shippingAddress: address(), billingAddress: address() });
    await checkout.execute({ action: 'shipping', cartId: cart.id, shippingMethod: { id: 'flat', name: 'Fijo', amount: 5 } });
    const blocked = await checkout.execute({ action: 'payment', cartId: cart.id, paymentMethod: { provider: 'manual', method: 'offline' } });
    expect(blocked.isErr()).toBe(true);

    await confirm.execute(cart.id);
    const paid = await checkout.execute({ action: 'payment', cartId: cart.id, paymentMethod: { provider: 'manual', method: 'offline' } });
    expect(paid.isOk()).toBe(true);
  });

  it('fusiona carrito invitado con carrito de cliente consolidando variante', async () => {
    const carts = new InMemoryCartRepository();
    const catalog = new InMemoryCatalogSnapshotService();
    catalog.variants.set('v1', variant({ unitPrice: 10, availableStock: 3 }));
    const add = new AddCartLineUseCase(carts, catalog);
    const merge = new MergeGuestCartUseCase(carts, catalog);

    await add.execute({ storeId: 'store-1', channel: 'web', token: 'guest', variantId: 'v1', quantity: 2 });
    await add.execute({ storeId: 'store-1', channel: 'web', customerId: 'customer-1', variantId: 'v1', quantity: 2 });
    const merged = (await merge.execute({ storeId: 'store-1', channel: 'web', guestToken: 'guest', customerId: 'customer-1' })).value;

    expect(merged.lines[0]?.quantity).toBe(3);
  });

  it('identifica al comprador guest por email y reusa el mismo cliente en reintentos', async () => {
    const carts = new InMemoryCartRepository();
    const catalog = new InMemoryCatalogSnapshotService();
    const directory = new InMemoryCustomerDirectory();
    catalog.variants.set('v1', variant({ unitPrice: 10, availableStock: 1 }));

    const add = new AddCartLineUseCase(carts, catalog);
    const identify = new IdentifyCheckoutCustomerUseCase(carts, directory);

    const cart = (await add.execute({ storeId: 'store-1', channel: 'web', token: 'guest', variantId: 'v1', quantity: 1 })).value;
    expect(cart.customerId).toBeNull();

    const first = await identify.execute({ cartId: cart.id, email: 'guest@example.com', firstName: 'Guest', lastName: 'User' });
    const replay = await identify.execute({ cartId: cart.id, email: 'guest@example.com' });

    expect(first.isOk()).toBe(true);
    expect(replay.isOk()).toBe(true);
    if (first.isOk() && replay.isOk()) {
      expect(first.value.customerId).not.toBeNull();
      expect(replay.value.customerId).toBe(first.value.customerId);
    }
    expect(directory.customers.size).toBe(1);
  });
});

function variant(input: { unitPrice: number; availableStock: number }) {
  return {
    variantId: 'v1',
    productId: 'p1',
    productTitle: 'Producto',
    variantTitle: 'Default',
    sku: 'SKU',
    currencyCode: 'MXN',
    unitPrice: input.unitPrice,
    availableStock: input.availableStock,
    locationId: 'loc-1',
  };
}

function address() {
  return { firstName: 'A', lastName: 'B', phone: null, line1: 'Uno', line2: null, city: 'CDMX', province: null, postalCode: null, countryCode: 'MX' };
}
