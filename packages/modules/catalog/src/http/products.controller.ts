import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, NoStoreScope, RequirePermission, type AuthenticatedUser } from '@mitama/contracts';
import { CreateProductUseCase } from '../application/create-product/create-product.use-case';
import { UpdateProductUseCase } from '../application/update-product/update-product.use-case';
import { DeleteProductUseCase } from '../application/delete-product/delete-product.use-case';
import { ListProductsUseCase } from '../application/list-products/list-products.use-case';
import { GetProductUseCase } from '../application/get-product/get-product.use-case';
import { SetProductStatusUseCase } from '../application/set-product-status/set-product-status.use-case';
import { AddProductOptionUseCase } from '../application/manage-product-options/add-option.use-case';
import { UpdateProductOptionUseCase } from '../application/manage-product-options/update-option.use-case';
import { RemoveProductOptionUseCase } from '../application/manage-product-options/remove-option.use-case';
import { AddProductOptionValueUseCase } from '../application/manage-product-options/add-option-value.use-case';
import { RemoveProductOptionValueUseCase } from '../application/manage-product-options/remove-option-value.use-case';
import { AddVariantUseCase } from '../application/manage-product-variants/add-variant.use-case';
import { UpdateVariantUseCase } from '../application/manage-product-variants/update-variant.use-case';
import { RemoveVariantUseCase } from '../application/manage-product-variants/remove-variant.use-case';
import { PreviewVariantMatrixUseCase } from '../application/manage-product-variants/preview-variant-matrix.use-case';
import { AddSpecificationUseCase } from '../application/manage-product-specifications/add-specification.use-case';
import { UpdateSpecificationUseCase } from '../application/manage-product-specifications/update-specification.use-case';
import { RemoveSpecificationUseCase } from '../application/manage-product-specifications/remove-specification.use-case';
import { SetVariantBasePriceUseCase } from '../application/manage-product-prices/set-variant-base-price.use-case';
import { AddVariantTierPriceUseCase } from '../application/manage-product-prices/add-variant-tier-price.use-case';
import { UpdateVariantTierPriceUseCase } from '../application/manage-product-prices/update-variant-tier-price.use-case';
import { RemoveVariantTierPriceUseCase } from '../application/manage-product-prices/remove-variant-tier-price.use-case';
import { GetEffectivePriceUseCase } from '../application/get-effective-price/get-effective-price.use-case';
import type { ProductOutput } from '../application/product.dto';
import type { ListProductsOutput } from '../application/list-products/list-products.dto';
import type { EffectivePriceOutput } from '../application/get-effective-price/get-effective-price.dto';
import type { VariantCombinationPreview } from '../application/manage-product-variants/preview-variant-matrix.use-case';
import {
  InvalidTierPriceRangeError,
  InvalidVariantCombinationError,
  LastVariantCannotBeRemovedError,
  NoPriceConfiguredError,
  ProductHandleAlreadyInUseError,
  ProductNotFoundError,
  ProductOptionNotFoundError,
  ProductOptionValueNotFoundError,
  ProductSpecificationNotFoundError,
  ProductVariantNotFoundError,
  VariantPriceNotFoundError,
  VariantSkuAlreadyInUseError,
} from '../domain/errors';
import { CreateProductRequestDto } from './dto/create-product.request.dto';
import { UpdateProductRequestDto } from './dto/update-product.request.dto';
import { ListProductsRequestDto } from './dto/list-products.request.dto';
import { SetProductStatusRequestDto } from './dto/set-product-status.request.dto';
import {
  AddProductOptionRequestDto,
  AddProductOptionValueRequestDto,
  UpdateProductOptionRequestDto,
} from './dto/product-option.request.dto';
import { AddVariantRequestDto, UpdateVariantRequestDto } from './dto/product-variant.request.dto';
import { AddSpecificationRequestDto, UpdateSpecificationRequestDto } from './dto/product-specification.request.dto';
import {
  AddVariantTierPriceRequestDto,
  SetVariantBasePriceRequestDto,
  UpdateVariantTierPriceRequestDto,
} from './dto/variant-price.request.dto';
import { GetEffectivePriceRequestDto } from './dto/get-effective-price.request.dto';

@ApiTags('catalog-products')
@Controller('catalog/products')
@NoStoreScope()
@RequirePermission('products.read')
export class ProductsController {
  constructor(
    private readonly createProduct: CreateProductUseCase,
    private readonly updateProduct: UpdateProductUseCase,
    private readonly deleteProduct: DeleteProductUseCase,
    private readonly listProducts: ListProductsUseCase,
    private readonly getProduct: GetProductUseCase,
    private readonly setProductStatus: SetProductStatusUseCase,
    private readonly addOption: AddProductOptionUseCase,
    private readonly updateOption: UpdateProductOptionUseCase,
    private readonly removeOption: RemoveProductOptionUseCase,
    private readonly addOptionValue: AddProductOptionValueUseCase,
    private readonly removeOptionValue: RemoveProductOptionValueUseCase,
    private readonly addVariant: AddVariantUseCase,
    private readonly updateVariant: UpdateVariantUseCase,
    private readonly removeVariant: RemoveVariantUseCase,
    private readonly previewVariantMatrix: PreviewVariantMatrixUseCase,
    private readonly addSpecification: AddSpecificationUseCase,
    private readonly updateSpecification: UpdateSpecificationUseCase,
    private readonly removeSpecification: RemoveSpecificationUseCase,
    private readonly setVariantBasePrice: SetVariantBasePriceUseCase,
    private readonly addVariantTierPrice: AddVariantTierPriceUseCase,
    private readonly updateVariantTierPrice: UpdateVariantTierPriceUseCase,
    private readonly removeVariantTierPrice: RemoveVariantTierPriceUseCase,
    private readonly getEffectivePrice: GetEffectivePriceUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista los productos (paginado, con filtros)' })
  @ApiOkResponse({ description: 'Página de productos' })
  async list(@Query() query: ListProductsRequestDto): Promise<ListProductsOutput> {
    const result = await this.listProducts.execute(query);
    return result.unwrapOr({ items: [], total: 0, page: query.page ?? 1, pageSize: query.pageSize ?? 20 });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un producto por id, con opciones, variantes y especificaciones' })
  @ApiOkResponse({ description: 'Producto encontrado' })
  @ApiNotFoundResponse({ description: 'El producto no existe' })
  async get(@Param('id') id: string): Promise<ProductOutput> {
    const result = await this.getProduct.execute(id);
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return result.value;
  }

  @Get(':id/variant-matrix')
  @ApiOperation({ summary: 'Calcula la matriz de combinaciones de opciones e indica cuáles ya tienen variante' })
  @ApiOkResponse({ description: 'Combinaciones de opciones' })
  @ApiNotFoundResponse({ description: 'El producto no existe' })
  async variantMatrix(@Param('id') id: string): Promise<VariantCombinationPreview[]> {
    const result = await this.previewVariantMatrix.execute(id);
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return result.value;
  }

  @Post()
  @RequirePermission('products.create')
  @ApiOperation({ summary: 'Crea un producto (siempre con al menos una variante)' })
  @ApiCreatedResponse({ description: 'Producto creado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({ description: 'El slug o el SKU ya están en uso' })
  async create(
    @Body() body: CreateProductRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductOutput> {
    const result = await this.createProduct.execute({ ...body, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  @Patch(':id')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Actualiza los datos generales de un producto' })
  @ApiOkResponse({ description: 'Producto actualizado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'El producto no existe' })
  @ApiConflictResponse({ description: 'El slug ya está en uso' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateProductRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductOutput> {
    const result = await this.updateProduct.execute({ id, ...body, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  @Patch(':id/status')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Cambia el estado de publicación de un producto' })
  @ApiOkResponse({ description: 'Producto actualizado' })
  @ApiNotFoundResponse({ description: 'El producto no existe' })
  async setStatus(
    @Param('id') id: string,
    @Body() body: SetProductStatusRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductOutput> {
    const result = await this.setProductStatus.execute({ id, status: body.status, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  @Delete(':id')
  @RequirePermission('products.delete')
  @ApiOperation({ summary: 'Elimina (baja lógica) un producto' })
  @ApiOkResponse({ description: 'Producto eliminado' })
  @ApiNotFoundResponse({ description: 'El producto no existe' })
  async remove(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser): Promise<{ success: true }> {
    const result = await this.deleteProduct.execute({ id, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return { success: true };
  }

  // ----- Opciones -----

  @Post(':id/options')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Agrega una opción de variante (ej. "Talla") con sus valores iniciales' })
  @ApiCreatedResponse({ description: 'Producto actualizado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'El producto no existe' })
  async addProductOption(
    @Param('id') id: string,
    @Body() body: AddProductOptionRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductOutput> {
    const result = await this.addOption.execute({ productId: id, ...body, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  @Patch(':id/options/:optionId')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Actualiza el título de una opción' })
  @ApiOkResponse({ description: 'Producto actualizado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'El producto o la opción no existen' })
  async updateProductOption(
    @Param('id') id: string,
    @Param('optionId') optionId: string,
    @Body() body: UpdateProductOptionRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductOutput> {
    const result = await this.updateOption.execute({
      productId: id,
      optionId,
      title: body.title,
      actorUserId: user?.id ?? null,
    });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  @Delete(':id/options/:optionId')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Elimina una opción y limpia las referencias en las variantes existentes' })
  @ApiOkResponse({ description: 'Producto actualizado' })
  @ApiNotFoundResponse({ description: 'El producto o la opción no existen' })
  async removeProductOption(
    @Param('id') id: string,
    @Param('optionId') optionId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductOutput> {
    const result = await this.removeOption.execute({ productId: id, optionId, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  @Post(':id/options/:optionId/values')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Agrega un valor a una opción' })
  @ApiCreatedResponse({ description: 'Producto actualizado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'El producto o la opción no existen' })
  async addProductOptionValue(
    @Param('id') id: string,
    @Param('optionId') optionId: string,
    @Body() body: AddProductOptionValueRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductOutput> {
    const result = await this.addOptionValue.execute({
      productId: id,
      optionId,
      value: body.value,
      actorUserId: user?.id ?? null,
    });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  @Delete(':id/options/:optionId/values/:valueId')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Elimina un valor de opción y lo quita de las variantes que lo referencien' })
  @ApiOkResponse({ description: 'Producto actualizado' })
  @ApiNotFoundResponse({ description: 'El producto, la opción o el valor no existen' })
  async removeProductOptionValue(
    @Param('id') id: string,
    @Param('optionId') optionId: string,
    @Param('valueId') valueId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductOutput> {
    const result = await this.removeOptionValue.execute({
      productId: id,
      optionId,
      valueId,
      actorUserId: user?.id ?? null,
    });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  // ----- Variantes -----

  @Post(':id/variants')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Agrega una variante (SKU único, opcionalmente ligada a una combinación de opciones)' })
  @ApiCreatedResponse({ description: 'Producto actualizado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos o combinación de opciones inválida' })
  @ApiConflictResponse({ description: 'El SKU ya está en uso' })
  @ApiNotFoundResponse({ description: 'El producto no existe' })
  async addProductVariant(
    @Param('id') id: string,
    @Body() body: AddVariantRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductOutput> {
    const result = await this.addVariant.execute({ productId: id, ...body, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  @Patch(':id/variants/:variantId')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Actualiza una variante' })
  @ApiOkResponse({ description: 'Producto actualizado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos o combinación de opciones inválida' })
  @ApiConflictResponse({ description: 'El SKU ya está en uso' })
  @ApiNotFoundResponse({ description: 'El producto o la variante no existen' })
  async updateProductVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() body: UpdateVariantRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductOutput> {
    const result = await this.updateVariant.execute({
      productId: id,
      variantId,
      ...body,
      actorUserId: user?.id ?? null,
    });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  @Delete(':id/variants/:variantId')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Elimina una variante (no permitido si es la única del producto)' })
  @ApiOkResponse({ description: 'Producto actualizado' })
  @ApiConflictResponse({ description: 'Un producto debe tener al menos una variante' })
  @ApiNotFoundResponse({ description: 'El producto o la variante no existen' })
  async removeProductVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductOutput> {
    const result = await this.removeVariant.execute({ productId: id, variantId, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  // ----- Precios -----

  @Put(':id/variants/:variantId/prices/base')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Crea o actualiza el precio base de una variante en una moneda' })
  @ApiOkResponse({ description: 'Producto actualizado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'El producto o la variante no existen' })
  async setVariantBasePriceEndpoint(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() body: SetVariantBasePriceRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductOutput> {
    const result = await this.setVariantBasePrice.execute({
      productId: id,
      variantId,
      ...body,
      actorUserId: user?.id ?? null,
    });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  @Post(':id/variants/:variantId/prices/tiers')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Agrega un precio por cantidad (tier price) a una variante' })
  @ApiCreatedResponse({ description: 'Producto actualizado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos o rango de cantidades inválido' })
  @ApiNotFoundResponse({ description: 'El producto o la variante no existen' })
  async addVariantTierPriceEndpoint(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() body: AddVariantTierPriceRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductOutput> {
    const result = await this.addVariantTierPrice.execute({
      productId: id,
      variantId,
      ...body,
      actorUserId: user?.id ?? null,
    });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  @Patch(':id/variants/:variantId/prices/tiers/:priceId')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Actualiza un precio por cantidad (tier price) de una variante' })
  @ApiOkResponse({ description: 'Producto actualizado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos o rango de cantidades inválido' })
  @ApiNotFoundResponse({ description: 'El producto, la variante o el precio no existen' })
  async updateVariantTierPriceEndpoint(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Param('priceId') priceId: string,
    @Body() body: UpdateVariantTierPriceRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductOutput> {
    const result = await this.updateVariantTierPrice.execute({
      productId: id,
      variantId,
      priceId,
      ...body,
      actorUserId: user?.id ?? null,
    });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  @Delete(':id/variants/:variantId/prices/tiers/:priceId')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Elimina un precio por cantidad (tier price) de una variante' })
  @ApiOkResponse({ description: 'Producto actualizado' })
  @ApiNotFoundResponse({ description: 'El producto, la variante o el precio no existen' })
  async removeVariantTierPriceEndpoint(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Param('priceId') priceId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductOutput> {
    const result = await this.removeVariantTierPrice.execute({
      productId: id,
      variantId,
      priceId,
      actorUserId: user?.id ?? null,
    });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  @Get(':id/variants/:variantId/effective-price')
  @ApiOperation({
    summary: 'Resuelve el precio efectivo de una variante (lista de precios activa > oferta > tier price > precio base)',
  })
  @ApiOkResponse({ description: 'Precio efectivo' })
  @ApiNotFoundResponse({ description: 'El producto o la variante no existen' })
  @ApiBadRequestResponse({ description: 'No hay un precio configurado para la moneda solicitada' })
  async getEffectivePriceEndpoint(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Query() query: GetEffectivePriceRequestDto,
  ): Promise<EffectivePriceOutput> {
    const result = await this.getEffectivePrice.execute({ productId: id, variantId, ...query });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  // ----- Especificaciones -----

  @Post(':id/specifications')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Agrega un atributo de especificación descriptivo' })
  @ApiCreatedResponse({ description: 'Producto actualizado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'El producto no existe' })
  async addProductSpecification(
    @Param('id') id: string,
    @Body() body: AddSpecificationRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductOutput> {
    const result = await this.addSpecification.execute({ productId: id, ...body, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  @Patch(':id/specifications/:specificationId')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Actualiza un atributo de especificación' })
  @ApiOkResponse({ description: 'Producto actualizado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'El producto o la especificación no existen' })
  async updateProductSpecification(
    @Param('id') id: string,
    @Param('specificationId') specificationId: string,
    @Body() body: UpdateSpecificationRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductOutput> {
    const result = await this.updateSpecification.execute({
      productId: id,
      specificationId,
      ...body,
      actorUserId: user?.id ?? null,
    });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  @Delete(':id/specifications/:specificationId')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Elimina un atributo de especificación' })
  @ApiOkResponse({ description: 'Producto actualizado' })
  @ApiNotFoundResponse({ description: 'El producto o la especificación no existen' })
  async removeProductSpecification(
    @Param('id') id: string,
    @Param('specificationId') specificationId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ProductOutput> {
    const result = await this.removeSpecification.execute({
      productId: id,
      specificationId,
      actorUserId: user?.id ?? null,
    });
    if (result.isErr()) {
      return this.handleError(result.error);
    }
    return result.value;
  }

  private handleError(error: Error): never {
    if (
      error instanceof ProductNotFoundError ||
      error instanceof ProductOptionNotFoundError ||
      error instanceof ProductOptionValueNotFoundError ||
      error instanceof ProductVariantNotFoundError ||
      error instanceof ProductSpecificationNotFoundError ||
      error instanceof VariantPriceNotFoundError
    ) {
      throw new NotFoundException(error.message);
    }
    if (
      error instanceof ProductHandleAlreadyInUseError ||
      error instanceof VariantSkuAlreadyInUseError ||
      error instanceof LastVariantCannotBeRemovedError
    ) {
      throw new ConflictException(error.message);
    }
    if (error instanceof InvalidVariantCombinationError || error instanceof InvalidTierPriceRangeError || error instanceof NoPriceConfiguredError) {
      throw new BadRequestException(error.message);
    }
    throw new BadRequestException(error.message);
  }
}
