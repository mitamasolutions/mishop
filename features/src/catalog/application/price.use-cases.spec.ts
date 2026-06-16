import { beforeEach, describe, expect, it } from 'vitest';
import { ValidationError } from '@mitama/core';
import {
  InvalidDateRangeError,
  InvalidTierPriceRangeError,
  NoPriceConfiguredError,
  PriceListNotFoundError,
  PriceListPriceNotFoundError,
  ProductNotFoundError,
  ProductVariantNotFoundError,
  VariantPriceNotFoundError,
} from '../domain/errors';
import { CreateProductUseCase } from './create-product/create-product.use-case';
import { UpdateVariantUseCase } from './manage-product-variants/update-variant.use-case';
import { SetVariantBasePriceUseCase } from './manage-product-prices/set-variant-base-price.use-case';
import { AddVariantTierPriceUseCase } from './manage-product-prices/add-variant-tier-price.use-case';
import { UpdateVariantTierPriceUseCase } from './manage-product-prices/update-variant-tier-price.use-case';
import { RemoveVariantTierPriceUseCase } from './manage-product-prices/remove-variant-tier-price.use-case';
import { CreatePriceListUseCase } from './create-price-list/create-price-list.use-case';
import { UpdatePriceListUseCase } from './update-price-list/update-price-list.use-case';
import { SetPriceListStatusUseCase } from './set-price-list-status/set-price-list-status.use-case';
import { ListPriceListsUseCase } from './list-price-lists/list-price-lists.use-case';
import { GetPriceListUseCase } from './get-price-list/get-price-list.use-case';
import { DeletePriceListUseCase } from './delete-price-list/delete-price-list.use-case';
import { AddPriceListPriceUseCase } from './manage-price-list-prices/add-price-list-price.use-case';
import { UpdatePriceListPriceUseCase } from './manage-price-list-prices/update-price-list-price.use-case';
import { RemovePriceListPriceUseCase } from './manage-price-list-prices/remove-price-list-price.use-case';
import { GetEffectivePriceUseCase } from './get-effective-price/get-effective-price.use-case';
import { InMemoryPriceListRepository, InMemoryProductRepository } from './test-support/in-memory-repositories';

describe('Precios de variante (base y tier)', () => {
  let products: InMemoryProductRepository;

  beforeEach(() => {
    products = new InMemoryProductRepository();
  });

  async function createProduct() {
    const result = await new CreateProductUseCase(products).execute({
      title: 'Camiseta',
      defaultVariantSku: 'CAM-001',
      actorUserId: null,
    });
    if (!result.isOk()) throw new Error('setup');
    return result.value;
  }

  it('fija el precio base de una variante en una moneda', async () => {
    const product = await createProduct();
    const variantId = product.variants[0].id;

    const result = await new SetVariantBasePriceUseCase(products).execute({
      productId: product.id,
      variantId,
      currencyCode: 'mxn',
      amount: 199,
      actorUserId: null,
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const variant = result.value.variants.find((v) => v.id === variantId);
      expect(variant?.prices).toEqual([{ id: expect.any(String), currencyCode: 'MXN', amount: 199, minQuantity: null, maxQuantity: null }]);
    }
  });

  it('reescribe el precio base existente para la misma moneda', async () => {
    const product = await createProduct();
    const variantId = product.variants[0].id;

    await new SetVariantBasePriceUseCase(products).execute({
      productId: product.id,
      variantId,
      currencyCode: 'MXN',
      amount: 199,
      actorUserId: null,
    });
    const result = await new SetVariantBasePriceUseCase(products).execute({
      productId: product.id,
      variantId,
      currencyCode: 'MXN',
      amount: 249,
      actorUserId: null,
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const variant = result.value.variants.find((v) => v.id === variantId);
      expect(variant?.prices).toHaveLength(1);
      expect(variant?.prices[0].amount).toBe(249);
    }
  });

  it('falla con ValidationError si la moneda está vacía', async () => {
    const product = await createProduct();
    const result = await new SetVariantBasePriceUseCase(products).execute({
      productId: product.id,
      variantId: product.variants[0].id,
      currencyCode: '   ',
      amount: 199,
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });

  it('falla con ValidationError si el precio es negativo', async () => {
    const product = await createProduct();
    const result = await new SetVariantBasePriceUseCase(products).execute({
      productId: product.id,
      variantId: product.variants[0].id,
      currencyCode: 'MXN',
      amount: -1,
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });

  it('falla con ProductNotFoundError si el producto no existe', async () => {
    const result = await new SetVariantBasePriceUseCase(products).execute({
      productId: 'no-existe',
      variantId: 'no-existe',
      currencyCode: 'MXN',
      amount: 199,
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ProductNotFoundError);
    }
  });

  it('falla con ProductVariantNotFoundError si la variante no existe', async () => {
    const product = await createProduct();
    const result = await new SetVariantBasePriceUseCase(products).execute({
      productId: product.id,
      variantId: 'no-existe',
      currencyCode: 'MXN',
      amount: 199,
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ProductVariantNotFoundError);
    }
  });

  it('agrega, actualiza y elimina un tier price', async () => {
    const product = await createProduct();
    const variantId = product.variants[0].id;

    const added = await new AddVariantTierPriceUseCase(products).execute({
      productId: product.id,
      variantId,
      currencyCode: 'MXN',
      amount: 180,
      minQuantity: 10,
      maxQuantity: 49,
      actorUserId: null,
    });
    expect(added.isOk()).toBe(true);
    if (!added.isOk()) throw new Error('setup');
    const priceId = added.value.variants.find((v) => v.id === variantId)!.prices[0].id;

    const updated = await new UpdateVariantTierPriceUseCase(products).execute({
      productId: product.id,
      variantId,
      priceId,
      amount: 170,
      actorUserId: null,
    });
    expect(updated.isOk()).toBe(true);
    if (updated.isOk()) {
      const tier = updated.value.variants.find((v) => v.id === variantId)!.prices[0];
      expect(tier.amount).toBe(170);
      expect(tier.minQuantity).toBe(10);
    }

    const removed = await new RemoveVariantTierPriceUseCase(products).execute({
      productId: product.id,
      variantId,
      priceId,
      actorUserId: null,
    });
    expect(removed.isOk()).toBe(true);
    if (removed.isOk()) {
      expect(removed.value.variants.find((v) => v.id === variantId)!.prices).toHaveLength(0);
    }
  });

  it('falla con InvalidTierPriceRangeError si minQuantity es menor a 1', async () => {
    const product = await createProduct();
    const result = await new AddVariantTierPriceUseCase(products).execute({
      productId: product.id,
      variantId: product.variants[0].id,
      currencyCode: 'MXN',
      amount: 180,
      minQuantity: 0,
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidTierPriceRangeError);
    }
  });

  it('falla con InvalidTierPriceRangeError si maxQuantity es menor a minQuantity', async () => {
    const product = await createProduct();
    const result = await new AddVariantTierPriceUseCase(products).execute({
      productId: product.id,
      variantId: product.variants[0].id,
      currencyCode: 'MXN',
      amount: 180,
      minQuantity: 10,
      maxQuantity: 5,
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidTierPriceRangeError);
    }
  });

  it('falla con VariantPriceNotFoundError al actualizar un tier price inexistente', async () => {
    const product = await createProduct();
    const result = await new UpdateVariantTierPriceUseCase(products).execute({
      productId: product.id,
      variantId: product.variants[0].id,
      priceId: 'no-existe',
      amount: 100,
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(VariantPriceNotFoundError);
    }
  });

  it('falla con VariantPriceNotFoundError al eliminar un tier price inexistente', async () => {
    const product = await createProduct();
    const result = await new RemoveVariantTierPriceUseCase(products).execute({
      productId: product.id,
      variantId: product.variants[0].id,
      priceId: 'no-existe',
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(VariantPriceNotFoundError);
    }
  });
});

describe('Listas de precios (CRUD)', () => {
  let priceLists: InMemoryPriceListRepository;

  beforeEach(() => {
    priceLists = new InMemoryPriceListRepository();
  });

  it('crea, actualiza, cambia el estado, lista, obtiene y elimina una lista de precios', async () => {
    const created = await new CreatePriceListUseCase(priceLists).execute({
      title: 'Venta de verano',
      type: 'sale',
      actorUserId: null,
    });
    expect(created.isOk()).toBe(true);
    if (!created.isOk()) throw new Error('setup');
    expect(created.value.status).toBe('draft');

    const updated = await new UpdatePriceListUseCase(priceLists).execute({
      id: created.value.id,
      title: 'Venta de verano 2026',
      actorUserId: null,
    });
    expect(updated.isOk()).toBe(true);
    if (updated.isOk()) {
      expect(updated.value.title).toBe('Venta de verano 2026');
    }

    const activated = await new SetPriceListStatusUseCase(priceLists).execute({
      id: created.value.id,
      status: 'active',
      actorUserId: null,
    });
    expect(activated.isOk()).toBe(true);
    if (activated.isOk()) {
      expect(activated.value.status).toBe('active');
    }

    const list = await new ListPriceListsUseCase(priceLists).execute({});
    expect(list.isOk()).toBe(true);
    if (list.isOk()) {
      expect(list.value.total).toBe(1);
    }

    const fetched = await new GetPriceListUseCase(priceLists).execute(created.value.id);
    expect(fetched.isOk()).toBe(true);
    if (fetched.isOk()) {
      expect(fetched.value.id).toBe(created.value.id);
    }

    const deleted = await new DeletePriceListUseCase(priceLists).execute({ id: created.value.id, actorUserId: null });
    expect(deleted.isOk()).toBe(true);
    expect(await priceLists.findById(created.value.id)).toBeNull();
  });

  it('falla con ValidationError si el título está vacío', async () => {
    const result = await new CreatePriceListUseCase(priceLists).execute({ title: '   ', actorUserId: null });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });

  it('falla con InvalidDateRangeError si endsAt es anterior a startsAt al crear', async () => {
    const result = await new CreatePriceListUseCase(priceLists).execute({
      title: 'Campaña inválida',
      startsAt: '2026-06-01T00:00:00.000Z',
      endsAt: '2026-05-01T00:00:00.000Z',
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidDateRangeError);
    }
  });

  it('falla con InvalidDateRangeError si endsAt es anterior a startsAt al actualizar', async () => {
    const created = await new CreatePriceListUseCase(priceLists).execute({
      title: 'Campaña',
      startsAt: '2026-06-01T00:00:00.000Z',
      actorUserId: null,
    });
    if (!created.isOk()) throw new Error('setup');

    const result = await new UpdatePriceListUseCase(priceLists).execute({
      id: created.value.id,
      endsAt: '2026-05-01T00:00:00.000Z',
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidDateRangeError);
    }
  });

  it('falla con PriceListNotFoundError al actualizar una lista inexistente', async () => {
    const result = await new UpdatePriceListUseCase(priceLists).execute({ id: 'no-existe', title: 'X', actorUserId: null });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(PriceListNotFoundError);
    }
  });

  it('falla con PriceListNotFoundError al obtener una lista inexistente', async () => {
    const result = await new GetPriceListUseCase(priceLists).execute('no-existe');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(PriceListNotFoundError);
    }
  });

  it('falla con PriceListNotFoundError al eliminar una lista inexistente', async () => {
    const result = await new DeletePriceListUseCase(priceLists).execute({ id: 'no-existe', actorUserId: null });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(PriceListNotFoundError);
    }
  });

  it('falla con PriceListNotFoundError al cambiar el estado de una lista inexistente', async () => {
    const result = await new SetPriceListStatusUseCase(priceLists).execute({ id: 'no-existe', status: 'active', actorUserId: null });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(PriceListNotFoundError);
    }
  });
});

describe('Overrides de listas de precios', () => {
  let products: InMemoryProductRepository;
  let priceLists: InMemoryPriceListRepository;

  beforeEach(() => {
    products = new InMemoryProductRepository();
    priceLists = new InMemoryPriceListRepository();
  });

  async function createProductAndPriceList() {
    const product = await new CreateProductUseCase(products).execute({
      title: 'Camiseta',
      defaultVariantSku: 'CAM-001',
      actorUserId: null,
    });
    if (!product.isOk()) throw new Error('setup');

    const priceList = await new CreatePriceListUseCase(priceLists).execute({ title: 'Campaña', type: 'override', actorUserId: null });
    if (!priceList.isOk()) throw new Error('setup');

    return { product: product.value, priceList: priceList.value };
  }

  it('agrega, actualiza y elimina un precio override de variante', async () => {
    const { product, priceList } = await createProductAndPriceList();
    const variantId = product.variants[0].id;

    const added = await new AddPriceListPriceUseCase(priceLists, products).execute({
      priceListId: priceList.id,
      variantId,
      currencyCode: 'mxn',
      amount: 150,
      minQuantity: 5,
      actorUserId: null,
    });
    expect(added.isOk()).toBe(true);
    if (!added.isOk()) throw new Error('setup');
    expect(added.value.prices).toHaveLength(1);
    const priceId = added.value.prices[0].id;
    expect(added.value.prices[0]).toMatchObject({ variantId, currencyCode: 'MXN', amount: 150, minQuantity: 5 });

    const updated = await new UpdatePriceListPriceUseCase(priceLists).execute({
      priceListId: priceList.id,
      priceId,
      amount: 140,
      actorUserId: null,
    });
    expect(updated.isOk()).toBe(true);
    if (updated.isOk()) {
      expect(updated.value.prices[0].amount).toBe(140);
    }

    const removed = await new RemovePriceListPriceUseCase(priceLists).execute({
      priceListId: priceList.id,
      priceId,
      actorUserId: null,
    });
    expect(removed.isOk()).toBe(true);
    if (removed.isOk()) {
      expect(removed.value.prices).toHaveLength(0);
    }
  });

  it('falla con PriceListNotFoundError al agregar un precio a una lista inexistente', async () => {
    const { product } = await createProductAndPriceList();
    const result = await new AddPriceListPriceUseCase(priceLists, products).execute({
      priceListId: 'no-existe',
      variantId: product.variants[0].id,
      currencyCode: 'MXN',
      amount: 150,
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(PriceListNotFoundError);
    }
  });

  it('falla con ProductVariantNotFoundError si la variante no existe', async () => {
    const { priceList } = await createProductAndPriceList();
    const result = await new AddPriceListPriceUseCase(priceLists, products).execute({
      priceListId: priceList.id,
      variantId: 'no-existe',
      currencyCode: 'MXN',
      amount: 150,
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ProductVariantNotFoundError);
    }
  });

  it('falla con InvalidTierPriceRangeError si el rango de cantidades es inválido', async () => {
    const { product, priceList } = await createProductAndPriceList();
    const result = await new AddPriceListPriceUseCase(priceLists, products).execute({
      priceListId: priceList.id,
      variantId: product.variants[0].id,
      currencyCode: 'MXN',
      amount: 150,
      minQuantity: 10,
      maxQuantity: 5,
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidTierPriceRangeError);
    }
  });

  it('falla con PriceListPriceNotFoundError al actualizar un override inexistente', async () => {
    const { priceList } = await createProductAndPriceList();
    const result = await new UpdatePriceListPriceUseCase(priceLists).execute({
      priceListId: priceList.id,
      priceId: 'no-existe',
      amount: 100,
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(PriceListPriceNotFoundError);
    }
  });

  it('falla con PriceListPriceNotFoundError al eliminar un override inexistente', async () => {
    const { priceList } = await createProductAndPriceList();
    const result = await new RemovePriceListPriceUseCase(priceLists).execute({
      priceListId: priceList.id,
      priceId: 'no-existe',
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(PriceListPriceNotFoundError);
    }
  });
});

describe('GetEffectivePriceUseCase', () => {
  let products: InMemoryProductRepository;
  let priceLists: InMemoryPriceListRepository;

  beforeEach(() => {
    products = new InMemoryProductRepository();
    priceLists = new InMemoryPriceListRepository();
  });

  async function createProductWithBasePrice() {
    const created = await new CreateProductUseCase(products).execute({
      title: 'Camiseta',
      defaultVariantSku: 'CAM-001',
      actorUserId: null,
    });
    if (!created.isOk()) throw new Error('setup');
    const variantId = created.value.variants[0].id;

    await new SetVariantBasePriceUseCase(products).execute({
      productId: created.value.id,
      variantId,
      currencyCode: 'MXN',
      amount: 200,
      actorUserId: null,
    });

    const product = await products.findById(created.value.id);
    return { product: product!, variantId };
  }

  it('resuelve el precio base cuando no hay otras reglas', async () => {
    const { product, variantId } = await createProductWithBasePrice();

    const result = await new GetEffectivePriceUseCase(products, priceLists).execute({
      productId: product.id,
      variantId,
      currencyCode: 'MXN',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toMatchObject({ amount: 200, source: 'base_price', basePrice: 200, priceListId: null });
    }
  });

  it('prioriza el tier price sobre el precio base cuando la cantidad lo alcanza', async () => {
    const { product, variantId } = await createProductWithBasePrice();

    await new AddVariantTierPriceUseCase(products).execute({
      productId: product.id,
      variantId,
      currencyCode: 'MXN',
      amount: 180,
      minQuantity: 10,
      actorUserId: null,
    });

    const result = await new GetEffectivePriceUseCase(products, priceLists).execute({
      productId: product.id,
      variantId,
      currencyCode: 'MXN',
      quantity: 10,
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toMatchObject({ amount: 180, source: 'tier_price', basePrice: 200 });
    }
  });

  it('no aplica el tier price si la cantidad no lo alcanza', async () => {
    const { product, variantId } = await createProductWithBasePrice();

    await new AddVariantTierPriceUseCase(products).execute({
      productId: product.id,
      variantId,
      currencyCode: 'MXN',
      amount: 180,
      minQuantity: 10,
      actorUserId: null,
    });

    const result = await new GetEffectivePriceUseCase(products, priceLists).execute({
      productId: product.id,
      variantId,
      currencyCode: 'MXN',
      quantity: 5,
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toMatchObject({ amount: 200, source: 'base_price' });
    }
  });

  it('prioriza la oferta de variante sobre el precio base cuando está vigente', async () => {
    const created = await new CreateProductUseCase(products).execute({
      title: 'Camiseta',
      defaultVariantSku: 'CAM-001',
      actorUserId: null,
    });
    if (!created.isOk()) throw new Error('setup');
    const variantId = created.value.variants[0].id;

    await new SetVariantBasePriceUseCase(products).execute({
      productId: created.value.id,
      variantId,
      currencyCode: 'MXN',
      amount: 200,
      actorUserId: null,
    });

    await new UpdateVariantUseCase(products).execute({
      productId: created.value.id,
      variantId,
      salePrice: 150,
      actorUserId: null,
    });

    const result = await new GetEffectivePriceUseCase(products, priceLists).execute({
      productId: created.value.id,
      variantId,
      currencyCode: 'MXN',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toMatchObject({ amount: 150, source: 'sale', basePrice: 200 });
    }
  });

  it('ignora la oferta de variante si está fuera de su vigencia', async () => {
    const created = await new CreateProductUseCase(products).execute({
      title: 'Camiseta',
      defaultVariantSku: 'CAM-001',
      actorUserId: null,
    });
    if (!created.isOk()) throw new Error('setup');
    const variantId = created.value.variants[0].id;

    await new SetVariantBasePriceUseCase(products).execute({
      productId: created.value.id,
      variantId,
      currencyCode: 'MXN',
      amount: 200,
      actorUserId: null,
    });

    await new UpdateVariantUseCase(products).execute({
      productId: created.value.id,
      variantId,
      salePrice: 150,
      saleEndsAt: '2020-01-01T00:00:00.000Z',
      actorUserId: null,
    });

    const result = await new GetEffectivePriceUseCase(products, priceLists).execute({
      productId: created.value.id,
      variantId,
      currencyCode: 'MXN',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toMatchObject({ amount: 200, source: 'base_price' });
    }
  });

  it('prioriza una lista de precios activa sobre la oferta, el tier price y el precio base', async () => {
    const created = await new CreateProductUseCase(products).execute({
      title: 'Camiseta',
      defaultVariantSku: 'CAM-001',
      actorUserId: null,
    });
    if (!created.isOk()) throw new Error('setup');
    const variantId = created.value.variants[0].id;

    await new SetVariantBasePriceUseCase(products).execute({
      productId: created.value.id,
      variantId,
      currencyCode: 'MXN',
      amount: 200,
      actorUserId: null,
    });
    await new AddVariantTierPriceUseCase(products).execute({
      productId: created.value.id,
      variantId,
      currencyCode: 'MXN',
      amount: 180,
      minQuantity: 10,
      actorUserId: null,
    });

    await new UpdateVariantUseCase(products).execute({
      productId: created.value.id,
      variantId,
      salePrice: 150,
      actorUserId: null,
    });

    const priceList = await new CreatePriceListUseCase(priceLists).execute({ title: 'Campaña', type: 'override', actorUserId: null });
    if (!priceList.isOk()) throw new Error('setup');
    await new SetPriceListStatusUseCase(priceLists).execute({ id: priceList.value.id, status: 'active', actorUserId: null });
    const added = await new AddPriceListPriceUseCase(priceLists, products).execute({
      priceListId: priceList.value.id,
      variantId,
      currencyCode: 'MXN',
      amount: 99,
      minQuantity: 10,
      actorUserId: null,
    });
    if (!added.isOk()) throw new Error('setup');

    const result = await new GetEffectivePriceUseCase(products, priceLists).execute({
      productId: created.value.id,
      variantId,
      currencyCode: 'MXN',
      quantity: 10,
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toMatchObject({ amount: 99, source: 'price_list', basePrice: 200, priceListId: priceList.value.id });
    }
  });

  it('falla con NoPriceConfiguredError si la variante no tiene ningún precio', async () => {
    const created = await new CreateProductUseCase(products).execute({
      title: 'Camiseta',
      defaultVariantSku: 'CAM-001',
      actorUserId: null,
    });
    if (!created.isOk()) throw new Error('setup');

    const result = await new GetEffectivePriceUseCase(products, priceLists).execute({
      productId: created.value.id,
      variantId: created.value.variants[0].id,
      currencyCode: 'MXN',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(NoPriceConfiguredError);
    }
  });

  it('falla con ProductNotFoundError si el producto no existe', async () => {
    const result = await new GetEffectivePriceUseCase(products, priceLists).execute({
      productId: 'no-existe',
      variantId: 'no-existe',
      currencyCode: 'MXN',
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ProductNotFoundError);
    }
  });

  it('falla con ProductVariantNotFoundError si la variante no existe', async () => {
    const created = await new CreateProductUseCase(products).execute({
      title: 'Camiseta',
      defaultVariantSku: 'CAM-001',
      actorUserId: null,
    });
    if (!created.isOk()) throw new Error('setup');

    const result = await new GetEffectivePriceUseCase(products, priceLists).execute({
      productId: created.value.id,
      variantId: 'no-existe',
      currencyCode: 'MXN',
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ProductVariantNotFoundError);
    }
  });
});
