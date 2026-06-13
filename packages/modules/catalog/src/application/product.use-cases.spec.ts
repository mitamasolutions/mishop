import { beforeEach, describe, expect, it } from 'vitest';
import type { RecordActivityInput } from '@mitama/activity-log';
import { ValidationError } from '@mitama/core';
import { Product } from '../domain/product.entity';
import type { ProductFilter, ProductPage, ProductRepository } from '../domain/product.repository';
import type { SlugRedirect } from '../domain/brand.repository';
import {
  InvalidVariantCombinationError,
  LastVariantCannotBeRemovedError,
  ProductHandleAlreadyInUseError,
  ProductNotFoundError,
  ProductOptionNotFoundError,
  ProductOptionValueNotFoundError,
  ProductSpecificationNotFoundError,
  ProductVariantNotFoundError,
  VariantSkuAlreadyInUseError,
} from '../domain/errors';
import { CreateProductUseCase } from './create-product/create-product.use-case';
import { UpdateProductUseCase } from './update-product/update-product.use-case';
import { GetProductUseCase } from './get-product/get-product.use-case';
import { ListProductsUseCase } from './list-products/list-products.use-case';
import { DeleteProductUseCase } from './delete-product/delete-product.use-case';
import { SetProductStatusUseCase } from './set-product-status/set-product-status.use-case';
import { AddProductOptionUseCase } from './manage-product-options/add-option.use-case';
import { AddProductOptionValueUseCase } from './manage-product-options/add-option-value.use-case';
import { RemoveProductOptionUseCase } from './manage-product-options/remove-option.use-case';
import { RemoveProductOptionValueUseCase } from './manage-product-options/remove-option-value.use-case';
import { PreviewVariantMatrixUseCase } from './manage-product-variants/preview-variant-matrix.use-case';
import { AddVariantUseCase } from './manage-product-variants/add-variant.use-case';
import { UpdateVariantUseCase } from './manage-product-variants/update-variant.use-case';
import { RemoveVariantUseCase } from './manage-product-variants/remove-variant.use-case';
import { AddSpecificationUseCase } from './manage-product-specifications/add-specification.use-case';
import { UpdateSpecificationUseCase } from './manage-product-specifications/update-specification.use-case';
import { RemoveSpecificationUseCase } from './manage-product-specifications/remove-specification.use-case';

class InMemoryProductRepository implements ProductRepository {
  readonly products = new Map<string, Product>();
  readonly activities: RecordActivityInput[] = [];
  readonly redirects: SlugRedirect[] = [];

  async findById(id: string): Promise<Product | null> {
    return this.products.get(id) ?? null;
  }

  async findByHandle(handle: string): Promise<Product | null> {
    for (const product of this.products.values()) {
      if (product.handle === handle) {
        return product;
      }
    }
    return null;
  }

  async findAll(filter: ProductFilter): Promise<ProductPage> {
    let items = [...this.products.values()];

    if (filter.search) {
      const search = filter.search.toLowerCase();
      items = items.filter(
        (product) =>
          product.title.toLowerCase().includes(search) ||
          product.handle.toLowerCase().includes(search) ||
          product.variants.some((variant) => variant.sku.toLowerCase().includes(search)),
      );
    }
    if (filter.status) {
      items = items.filter((product) => product.status === filter.status);
    }
    if (filter.categoryId) {
      items = items.filter((product) => product.categoryIds.includes(filter.categoryId!));
    }
    if (filter.collectionId) {
      items = items.filter((product) => product.collectionIds.includes(filter.collectionId!));
    }
    if (filter.salesChannelId) {
      items = items.filter((product) => product.salesChannelIds.includes(filter.salesChannelId!));
    }

    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const total = items.length;
    const start = (page - 1) * pageSize;

    return { items: items.slice(start, start + pageSize), total, page, pageSize };
  }

  async findVariantBySku(sku: string): Promise<{ productId: string; variantId: string } | null> {
    for (const product of this.products.values()) {
      const variant = product.variants.find((candidate) => candidate.sku === sku);
      if (variant) {
        return { productId: product.id, variantId: variant.id };
      }
    }
    return null;
  }

  async findVariantById(variantId: string): Promise<{ productId: string; variantId: string } | null> {
    for (const product of this.products.values()) {
      const variant = product.variants.find((candidate) => candidate.id === variantId);
      if (variant) {
        return { productId: product.id, variantId: variant.id };
      }
    }
    return null;
  }

  async create(product: Product, activity: RecordActivityInput): Promise<void> {
    this.products.set(product.id, product);
    this.activities.push(activity);
  }

  async update(product: Product, activity: RecordActivityInput, redirect: SlugRedirect | null): Promise<void> {
    this.products.set(product.id, product);
    this.activities.push(activity);
    if (redirect) {
      this.redirects.push(redirect);
    }
  }

  async remove(product: Product, activity: RecordActivityInput): Promise<void> {
    this.products.delete(product.id);
    this.activities.push(activity);
  }
}

describe('CreateProductUseCase', () => {
  let products: InMemoryProductRepository;

  beforeEach(() => {
    products = new InMemoryProductRepository();
  });

  it('crea un producto simple con una variante por defecto y autogenera el slug', async () => {
    const result = await new CreateProductUseCase(products).execute({
      title: 'Camiseta básica',
      defaultVariantSku: 'CAM-001',
      actorUserId: null,
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.handle).toBe('camiseta-basica');
      expect(result.value.status).toBe('draft');
      expect(result.value.variants).toHaveLength(1);
      expect(result.value.variants[0].sku).toBe('CAM-001');
      expect(result.value.options).toHaveLength(0);
    }
  });

  it('falla con ValidationError si el título está vacío', async () => {
    const result = await new CreateProductUseCase(products).execute({
      title: '  ',
      defaultVariantSku: 'SKU-1',
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });

  it('falla con ValidationError si el SKU por defecto está vacío', async () => {
    const result = await new CreateProductUseCase(products).execute({
      title: 'Producto',
      defaultVariantSku: '   ',
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });

  it('falla con ProductHandleAlreadyInUseError si el slug ya existe', async () => {
    await new CreateProductUseCase(products).execute({
      title: 'Camiseta básica',
      defaultVariantSku: 'CAM-001',
      actorUserId: null,
    });
    const result = await new CreateProductUseCase(products).execute({
      title: 'Camiseta básica',
      defaultVariantSku: 'CAM-002',
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ProductHandleAlreadyInUseError);
    }
  });

  it('falla con VariantSkuAlreadyInUseError si el SKU ya está en uso por otro producto', async () => {
    await new CreateProductUseCase(products).execute({
      title: 'Camiseta básica',
      defaultVariantSku: 'CAM-001',
      actorUserId: null,
    });
    const result = await new CreateProductUseCase(products).execute({
      title: 'Pantalón básico',
      defaultVariantSku: 'CAM-001',
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(VariantSkuAlreadyInUseError);
    }
  });
});

describe('UpdateProductUseCase', () => {
  let products: InMemoryProductRepository;

  beforeEach(() => {
    products = new InMemoryProductRepository();
  });

  async function createProduct() {
    const result = await new CreateProductUseCase(products).execute({
      title: 'Camiseta básica',
      defaultVariantSku: 'CAM-001',
      actorUserId: null,
    });
    if (!result.isOk()) {
      throw new Error('No se pudo crear el producto de prueba');
    }
    return result.value;
  }

  it('registra un redirect 301 cuando cambia el slug', async () => {
    const product = await createProduct();

    const result = await new UpdateProductUseCase(products).execute({
      id: product.id,
      handle: 'camiseta-premium',
      actorUserId: null,
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.handle).toBe('camiseta-premium');
    }
    expect(products.redirects).toHaveLength(1);
    expect(products.redirects[0]).toMatchObject({
      fromPath: '/productos/camiseta-basica',
      toPath: '/productos/camiseta-premium',
      entityType: 'product',
    });
  });

  it('falla con ProductNotFoundError si el producto no existe', async () => {
    const result = await new UpdateProductUseCase(products).execute({ id: 'no-existe', title: 'X', actorUserId: null });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ProductNotFoundError);
    }
  });
});

describe('GetProductUseCase / ListProductsUseCase / DeleteProductUseCase / SetProductStatusUseCase', () => {
  let products: InMemoryProductRepository;

  beforeEach(() => {
    products = new InMemoryProductRepository();
  });

  async function createProduct(title: string, sku: string) {
    const result = await new CreateProductUseCase(products).execute({ title, defaultVariantSku: sku, actorUserId: null });
    if (!result.isOk()) {
      throw new Error('No se pudo crear el producto de prueba');
    }
    return result.value;
  }

  it('obtiene un producto por id', async () => {
    const product = await createProduct('Camiseta', 'CAM-001');
    const result = await new GetProductUseCase(products).execute(product.id);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.id).toBe(product.id);
    }
  });

  it('falla con ProductNotFoundError al obtener un producto inexistente', async () => {
    const result = await new GetProductUseCase(products).execute('no-existe');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ProductNotFoundError);
    }
  });

  it('lista productos paginados', async () => {
    await createProduct('Camiseta', 'CAM-001');
    await createProduct('Pantalón', 'PAN-001');

    const result = await new ListProductsUseCase(products).execute({});
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.total).toBe(2);
      expect(result.value.items.map((item) => item.defaultSku).sort()).toEqual(['CAM-001', 'PAN-001']);
    }
  });

  it('cambia el estado del producto', async () => {
    const product = await createProduct('Camiseta', 'CAM-001');
    const result = await new SetProductStatusUseCase(products).execute({ id: product.id, status: 'published', actorUserId: null });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.status).toBe('published');
    }
  });

  it('elimina (baja lógica) un producto', async () => {
    const product = await createProduct('Camiseta', 'CAM-001');
    const result = await new DeleteProductUseCase(products).execute({ id: product.id, actorUserId: null });
    expect(result.isOk()).toBe(true);
    expect(await products.findById(product.id)).toBeNull();
  });

  it('falla con ProductNotFoundError al eliminar un producto inexistente', async () => {
    const result = await new DeleteProductUseCase(products).execute({ id: 'no-existe', actorUserId: null });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ProductNotFoundError);
    }
  });
});

describe('Opciones y matriz de variantes', () => {
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
    if (!result.isOk()) {
      throw new Error('No se pudo crear el producto de prueba');
    }
    return result.value;
  }

  it('agrega opciones con valores y calcula la matriz de combinaciones', async () => {
    const product = await createProduct();

    const withSize = await new AddProductOptionUseCase(products).execute({
      productId: product.id,
      title: 'Talla',
      values: ['S', 'M'],
      actorUserId: null,
    });
    expect(withSize.isOk()).toBe(true);

    const withColor = await new AddProductOptionUseCase(products).execute({
      productId: product.id,
      title: 'Color',
      values: ['Rojo', 'Azul'],
      actorUserId: null,
    });
    expect(withColor.isOk()).toBe(true);

    const matrix = await new PreviewVariantMatrixUseCase(products).execute(product.id);
    expect(matrix.isOk()).toBe(true);
    if (matrix.isOk()) {
      // 2 tallas x 2 colores = 4 combinaciones, ninguna tiene variante todavía
      expect(matrix.value).toHaveLength(4);
      expect(matrix.value.every((combination) => combination.exists === false)).toBe(true);
      expect(matrix.value.map((combination) => combination.label).sort()).toEqual(['M / Azul', 'M / Rojo', 'S / Azul', 'S / Rojo']);
    }
  });

  it('falla con ProductNotFoundError al previsualizar la matriz de un producto inexistente', async () => {
    const result = await new PreviewVariantMatrixUseCase(products).execute('no-existe');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ProductNotFoundError);
    }
  });

  it('falla con ProductOptionNotFoundError al agregar un valor a una opción inexistente', async () => {
    const product = await createProduct();
    const result = await new AddProductOptionValueUseCase(products).execute({
      productId: product.id,
      optionId: 'no-existe',
      value: 'M',
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ProductOptionNotFoundError);
    }
  });

  it('al eliminar una opción, limpia las referencias en las variantes existentes', async () => {
    const product = await createProduct();
    const option = await new AddProductOptionUseCase(products).execute({
      productId: product.id,
      title: 'Talla',
      values: ['S', 'M'],
      actorUserId: null,
    });
    if (!option.isOk()) throw new Error('setup');
    const sizeOption = option.value.options[0];
    const sValue = sizeOption.values[0];

    await new AddVariantUseCase(products).execute({
      productId: product.id,
      title: 'Camiseta - S',
      sku: 'CAM-001-S',
      optionValueIds: [sValue.id],
      actorUserId: null,
    });

    const removed = await new RemoveProductOptionUseCase(products).execute({
      productId: product.id,
      optionId: sizeOption.id,
      actorUserId: null,
    });
    expect(removed.isOk()).toBe(true);
    if (removed.isOk()) {
      expect(removed.value.options).toHaveLength(0);
      const variant = removed.value.variants.find((v) => v.sku === 'CAM-001-S');
      expect(variant?.optionValueIds).toEqual([]);
    }
  });

  it('falla con ProductOptionValueNotFoundError al eliminar un valor inexistente', async () => {
    const product = await createProduct();
    const option = await new AddProductOptionUseCase(products).execute({
      productId: product.id,
      title: 'Talla',
      values: ['S'],
      actorUserId: null,
    });
    if (!option.isOk()) throw new Error('setup');

    const result = await new RemoveProductOptionValueUseCase(products).execute({
      productId: product.id,
      optionId: option.value.options[0].id,
      valueId: 'no-existe',
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ProductOptionValueNotFoundError);
    }
  });

  it('al eliminar un valor de opción, lo quita de las variantes que lo referencian', async () => {
    const product = await createProduct();
    const option = await new AddProductOptionUseCase(products).execute({
      productId: product.id,
      title: 'Talla',
      values: ['S', 'M'],
      actorUserId: null,
    });
    if (!option.isOk()) throw new Error('setup');
    const sizeOption = option.value.options[0];
    const sValue = sizeOption.values.find((v) => v.value === 'S')!;

    await new AddVariantUseCase(products).execute({
      productId: product.id,
      title: 'Camiseta - S',
      sku: 'CAM-001-S',
      optionValueIds: [sValue.id],
      actorUserId: null,
    });

    const result = await new RemoveProductOptionValueUseCase(products).execute({
      productId: product.id,
      optionId: sizeOption.id,
      valueId: sValue.id,
      actorUserId: null,
    });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const variant = result.value.variants.find((v) => v.sku === 'CAM-001-S');
      expect(variant?.optionValueIds).toEqual([]);
    }
  });
});

describe('Variantes', () => {
  let products: InMemoryProductRepository;

  beforeEach(() => {
    products = new InMemoryProductRepository();
  });

  async function createProductWithSizeOption() {
    const created = await new CreateProductUseCase(products).execute({
      title: 'Camiseta',
      defaultVariantSku: 'CAM-001',
      actorUserId: null,
    });
    if (!created.isOk()) throw new Error('setup');

    const option = await new AddProductOptionUseCase(products).execute({
      productId: created.value.id,
      title: 'Talla',
      values: ['S', 'M'],
      actorUserId: null,
    });
    if (!option.isOk()) throw new Error('setup');

    return { product: created.value, option: option.value.options[0] };
  }

  it('agrega una variante con una combinación de opciones válida', async () => {
    const { product, option } = await createProductWithSizeOption();
    const sValue = option.values.find((v) => v.value === 'S')!;

    const result = await new AddVariantUseCase(products).execute({
      productId: product.id,
      title: 'Camiseta - S',
      sku: 'CAM-001-S',
      optionValueIds: [sValue.id],
      actorUserId: null,
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.variants).toHaveLength(2);
      expect(result.value.variants.some((v) => v.sku === 'CAM-001-S')).toBe(true);
    }
  });

  it('falla con VariantSkuAlreadyInUseError si el SKU ya está en uso', async () => {
    const { product } = await createProductWithSizeOption();

    const result = await new AddVariantUseCase(products).execute({
      productId: product.id,
      title: 'Camiseta - duplicado',
      sku: 'CAM-001',
      actorUserId: null,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(VariantSkuAlreadyInUseError);
    }
  });

  it('falla con InvalidVariantCombinationError si optionValueIds contiene ids inexistentes', async () => {
    const { product } = await createProductWithSizeOption();

    const result = await new AddVariantUseCase(products).execute({
      productId: product.id,
      title: 'Camiseta - inválida',
      sku: 'CAM-001-X',
      optionValueIds: ['no-existe'],
      actorUserId: null,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidVariantCombinationError);
    }
  });

  it('falla con InvalidVariantCombinationError si la combinación ya tiene una variante', async () => {
    const { product, option } = await createProductWithSizeOption();
    const sValue = option.values.find((v) => v.value === 'S')!;

    await new AddVariantUseCase(products).execute({
      productId: product.id,
      title: 'Camiseta - S',
      sku: 'CAM-001-S',
      optionValueIds: [sValue.id],
      actorUserId: null,
    });

    const result = await new AddVariantUseCase(products).execute({
      productId: product.id,
      title: 'Camiseta - S otra vez',
      sku: 'CAM-001-S2',
      optionValueIds: [sValue.id],
      actorUserId: null,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(InvalidVariantCombinationError);
    }
  });

  it('actualiza una variante existente', async () => {
    const { product } = await createProductWithSizeOption();
    const variantId = product.variants[0].id;

    const result = await new UpdateVariantUseCase(products).execute({
      productId: product.id,
      variantId,
      cost: 100,
      salePrice: 150,
      actorUserId: null,
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const variant = result.value.variants.find((v) => v.id === variantId);
      expect(variant?.cost).toBe(100);
      expect(variant?.salePrice).toBe(150);
    }
  });

  it('falla con ProductVariantNotFoundError al actualizar una variante inexistente', async () => {
    const { product } = await createProductWithSizeOption();

    const result = await new UpdateVariantUseCase(products).execute({
      productId: product.id,
      variantId: 'no-existe',
      cost: 100,
      actorUserId: null,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ProductVariantNotFoundError);
    }
  });

  it('falla con VariantSkuAlreadyInUseError si se actualiza a un SKU usado por otra variante', async () => {
    const { product, option } = await createProductWithSizeOption();
    const sValue = option.values.find((v) => v.value === 'S')!;

    const added = await new AddVariantUseCase(products).execute({
      productId: product.id,
      title: 'Camiseta - S',
      sku: 'CAM-001-S',
      optionValueIds: [sValue.id],
      actorUserId: null,
    });
    if (!added.isOk()) throw new Error('setup');
    const newVariant = added.value.variants.find((v) => v.sku === 'CAM-001-S')!;

    const result = await new UpdateVariantUseCase(products).execute({
      productId: product.id,
      variantId: newVariant.id,
      sku: 'CAM-001',
      actorUserId: null,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(VariantSkuAlreadyInUseError);
    }
  });

  it('no permite eliminar la última variante de un producto', async () => {
    const { product } = await createProductWithSizeOption();
    const variantId = product.variants[0].id;

    const result = await new RemoveVariantUseCase(products).execute({
      productId: product.id,
      variantId,
      actorUserId: null,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(LastVariantCannotBeRemovedError);
    }
  });

  it('elimina una variante cuando no es la única', async () => {
    const { product, option } = await createProductWithSizeOption();
    const sValue = option.values.find((v) => v.value === 'S')!;

    const added = await new AddVariantUseCase(products).execute({
      productId: product.id,
      title: 'Camiseta - S',
      sku: 'CAM-001-S',
      optionValueIds: [sValue.id],
      actorUserId: null,
    });
    if (!added.isOk()) throw new Error('setup');
    const newVariant = added.value.variants.find((v) => v.sku === 'CAM-001-S')!;

    const result = await new RemoveVariantUseCase(products).execute({
      productId: product.id,
      variantId: newVariant.id,
      actorUserId: null,
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.variants).toHaveLength(1);
    }
  });
});

describe('Especificaciones', () => {
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

  it('agrega, actualiza y elimina una especificación', async () => {
    const product = await createProduct();

    const added = await new AddSpecificationUseCase(products).execute({
      productId: product.id,
      name: 'Material',
      value: '100% algodón',
      actorUserId: null,
    });
    expect(added.isOk()).toBe(true);
    if (!added.isOk()) throw new Error('setup');
    const specification = added.value.specifications[0];
    expect(specification.name).toBe('Material');

    const updated = await new UpdateSpecificationUseCase(products).execute({
      productId: product.id,
      specificationId: specification.id,
      value: '95% algodón, 5% elastano',
      actorUserId: null,
    });
    expect(updated.isOk()).toBe(true);
    if (updated.isOk()) {
      expect(updated.value.specifications[0].value).toBe('95% algodón, 5% elastano');
      expect(updated.value.specifications[0].name).toBe('Material');
    }

    const removed = await new RemoveSpecificationUseCase(products).execute({
      productId: product.id,
      specificationId: specification.id,
      actorUserId: null,
    });
    expect(removed.isOk()).toBe(true);
    if (removed.isOk()) {
      expect(removed.value.specifications).toHaveLength(0);
    }
  });

  it('falla con ProductSpecificationNotFoundError al actualizar una especificación inexistente', async () => {
    const product = await createProduct();
    const result = await new UpdateSpecificationUseCase(products).execute({
      productId: product.id,
      specificationId: 'no-existe',
      value: 'X',
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ProductSpecificationNotFoundError);
    }
  });

  it('falla con ProductSpecificationNotFoundError al eliminar una especificación inexistente', async () => {
    const product = await createProduct();
    const result = await new RemoveSpecificationUseCase(products).execute({
      productId: product.id,
      specificationId: 'no-existe',
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ProductSpecificationNotFoundError);
    }
  });
});
