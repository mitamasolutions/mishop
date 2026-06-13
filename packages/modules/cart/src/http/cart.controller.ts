import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { NoStoreScope, Public } from '@mitama/contracts';
import {
  AddCartLineUseCase,
  AdvanceCheckoutUseCase,
  ConfirmCartPriceChangesUseCase,
  GetOrCreateCartUseCase,
  MergeGuestCartUseCase,
  RefreshCartUseCase,
} from '../application/cart-use-cases';
import { CartHasInvalidStockError, CartHasUnconfirmedPriceChangesError, CartNotFoundError } from '../domain/errors';
import type { CartOutput } from '../application/cart.dto';

class CartIdentityDto {
  @IsString()
  storeId!: string;

  @IsIn(['web', 'pos'])
  channel!: 'web' | 'pos';

  @IsOptional()
  @IsString()
  token?: string | null;

  @IsOptional()
  @IsString()
  customerId?: string | null;
}

class AddLineDto extends CartIdentityDto {
  @IsString()
  variantId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;
}

class MergeCartDto {
  @IsString()
  storeId!: string;

  @IsIn(['web', 'pos'])
  channel!: 'web' | 'pos';

  @IsString()
  guestToken!: string;

  @IsString()
  customerId!: string;
}

@ApiTags('cart')
@Controller('cart')
@Public()
@NoStoreScope()
export class CartController {
  constructor(
    private readonly getOrCreate: GetOrCreateCartUseCase,
    private readonly addLine: AddCartLineUseCase,
    private readonly refresh: RefreshCartUseCase,
    private readonly confirmPrices: ConfirmCartPriceChangesUseCase,
    private readonly checkout: AdvanceCheckoutUseCase,
    private readonly mergeGuest: MergeGuestCartUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Recupera o crea un carrito activo' })
  async get(@Query() query: CartIdentityDto): Promise<CartOutput> {
    const result = await this.getOrCreate.execute(query);
    if (result.isOk()) return result.value;
    throw new BadRequestException('No se pudo obtener el carrito');
  }

  @Post('lines')
  @ApiOperation({ summary: 'Agrega una variante al carrito' })
  async add(@Body() body: AddLineDto): Promise<CartOutput> {
    const result = await this.addLine.execute(body);
    if (result.isErr()) throw new BadRequestException(result.error.message);
    return result.value;
  }

  @Post(':cartId/refresh')
  @ApiOperation({ summary: 'Recalcula precios y stock del carrito' })
  async refreshCart(@Param('cartId') cartId: string): Promise<CartOutput> {
    const result = await this.refresh.execute(cartId);
    if (result.isErr()) throw new NotFoundException(result.error.message);
    return result.value;
  }

  @Post(':cartId/confirm-price-changes')
  @ApiOperation({ summary: 'Confirma cambios de precio detectados' })
  async confirm(@Param('cartId') cartId: string): Promise<CartOutput> {
    const result = await this.confirmPrices.execute(cartId);
    if (result.isErr()) throw new NotFoundException(result.error.message);
    return result.value;
  }

  @Post(':cartId/checkout/:action')
  @ApiOperation({ summary: 'Avanza el checkout: addresses, shipping, payment, confirmation' })
  async checkoutStep(@Param('cartId') cartId: string, @Param('action') action: string, @Body() body: Record<string, unknown>): Promise<CartOutput> {
    const result = await this.checkout.execute({ cartId, action, ...body } as never);
    if (result.isOk()) return result.value;
    if (result.error instanceof CartNotFoundError) throw new NotFoundException(result.error.message);
    if (result.error instanceof CartHasUnconfirmedPriceChangesError || result.error instanceof CartHasInvalidStockError) {
      throw new BadRequestException(result.error.message);
    }
    throw new BadRequestException(result.error.message);
  }

  @Post('merge')
  @ApiOperation({ summary: 'Fusiona el carrito invitado al iniciar sesión' })
  async merge(@Body() body: MergeCartDto): Promise<CartOutput> {
    const result = await this.mergeGuest.execute(body);
    if (result.isOk()) return result.value;
    throw new BadRequestException('No se pudo fusionar el carrito');
  }
}
