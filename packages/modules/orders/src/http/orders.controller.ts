import { BadRequestException, Body, ConflictException, Controller, Get, Headers, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { CurrentUser, NoStoreScope, Public, RequirePermission, type AuthenticatedUser } from '@mitama/contracts';
import {
  AddOrderNoteUseCase,
  CancelOrderUseCase,
  ChangeOrderStateUseCase,
  ChangePaymentStateUseCase,
  CreateOrderUseCase,
  ListOrdersUseCase,
  ResendOrderConfirmationUseCase,
} from '../application/order-use-cases';
import { IdempotencyConflictError, InsufficientStockError, OrderNotFoundError } from '../domain/errors';
import type { OrderOutput } from '../application/order.dto';

class CreateOrderRequestDto {
  @IsString()
  cartId!: string;
}

class TransitionRequestDto {
  @IsString()
  to!: string;

  @IsOptional()
  @IsString()
  actorId?: string | null;

  @IsOptional()
  @IsString()
  reason?: string | null;
}

class NoteRequestDto {
  @IsString()
  body!: string;
}

class ListOrdersQueryDto {
  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsIn(['pending', 'confirmed', 'completed', 'cancelled'])
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';

  @IsOptional()
  @IsIn(['pending', 'authorized', 'paid', 'partially_refunded', 'refunded', 'failed', 'voided', 'cancelled'])
  paymentStatus?: 'pending' | 'authorized' | 'paid' | 'partially_refunded' | 'refunded' | 'failed' | 'voided' | 'cancelled';

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  orderNumber?: string;
}

@ApiTags('orders')
@Controller('orders')
@NoStoreScope()
@RequirePermission('orders.read')
export class OrdersController {
  constructor(
    private readonly createOrder: CreateOrderUseCase,
    private readonly listOrders: ListOrdersUseCase,
    private readonly changeOrderState: ChangeOrderStateUseCase,
    private readonly changePaymentState: ChangePaymentStateUseCase,
    private readonly cancelOrder: CancelOrderUseCase,
    private readonly addNote: AddOrderNoteUseCase,
    private readonly resendConfirmation: ResendOrderConfirmationUseCase,
  ) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Confirma checkout y crea orden idempotente' })
  async create(@Body() body: CreateOrderRequestDto, @Headers('idempotency-key') idempotencyKey?: string): Promise<OrderOutput> {
    if (!idempotencyKey) throw new BadRequestException('El header Idempotency-Key es obligatorio');
    const result = await this.createOrder.execute({ cartId: body.cartId, idempotencyKey });
    if (result.isOk()) return result.value;
    if (result.error instanceof IdempotencyConflictError) throw new ConflictException(result.error.message);
    if (result.error instanceof InsufficientStockError) throw new BadRequestException(result.error.message);
    throw new BadRequestException(result.error.message);
  }

  @Get()
  @ApiOperation({ summary: 'Lista y filtra órdenes' })
  async list(@Query() query: ListOrdersQueryDto): Promise<OrderOutput[]> {
    const result = await this.listOrders.execute(query);
    if (result.isOk()) return result.value;
    throw new BadRequestException('No se pudieron listar las órdenes');
  }

  @Post(':orderId/order-state')
  @RequirePermission('orders.update')
  @ApiOperation({ summary: 'Cambia estado de orden respetando la máquina' })
  async orderState(
    @Param('orderId') orderId: string,
    @Body() body: TransitionRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<OrderOutput> {
    const result = await this.changeOrderState.execute({ orderId, to: body.to as never, actorId: user?.id ?? null, reason: body.reason });
    return this.unwrap(result);
  }

  @Post(':orderId/payment-state')
  @RequirePermission('orders.update')
  @ApiOperation({ summary: 'Cambia estado de pago respetando la máquina' })
  async paymentState(
    @Param('orderId') orderId: string,
    @Body() body: TransitionRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<OrderOutput> {
    const result = await this.changePaymentState.execute({ orderId, to: body.to as never, actorId: user?.id ?? null, reason: body.reason });
    return this.unwrap(result);
  }

  @Post(':orderId/cancel')
  @RequirePermission('orders.cancel')
  @ApiOperation({ summary: 'Cancela una orden y libera stock' })
  async cancel(
    @Param('orderId') orderId: string,
    @Body() body: Partial<TransitionRequestDto>,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<OrderOutput> {
    const result = await this.cancelOrder.execute({ orderId, actorId: user?.id ?? null, reason: body.reason });
    return this.unwrap(result);
  }

  @Post(':orderId/notes')
  @RequirePermission('orders.update')
  @ApiOperation({ summary: 'Agrega nota interna a la orden' })
  async note(
    @Param('orderId') orderId: string,
    @Body() body: NoteRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<OrderOutput> {
    const result = await this.addNote.execute({ orderId, authorId: user?.id ?? '', body: body.body });
    return this.unwrap(result);
  }

  @Post(':orderId/resend-confirmation')
  @RequirePermission('orders.update')
  @ApiOperation({ summary: 'Reenvía confirmación de orden' })
  async resend(@Param('orderId') orderId: string): Promise<void> {
    const result = await this.resendConfirmation.execute(orderId);
    if (result.isErr()) throw new NotFoundException(result.error.message);
  }

  private unwrap(result: { isOk(): boolean; value?: OrderOutput; error?: Error }): OrderOutput {
    if (result.isOk() && result.value) return result.value;
    if (result.error instanceof OrderNotFoundError) throw new NotFoundException(result.error.message);
    throw new BadRequestException(result.error?.message ?? 'Operación inválida');
  }
}
