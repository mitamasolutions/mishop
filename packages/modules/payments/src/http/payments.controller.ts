import { BadRequestException, Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, NotFoundException, Param, Post, Query, RawBodyRequest, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentStore, CurrentUser, Public, RequirePermission, type ActiveStore, type AuthenticatedUser } from '@mitama/contracts';
import {
  AuthorizePaymentUseCase,
  CapturePaymentUseCase,
  HandlePaymentWebhookUseCase,
  ListPaymentMethodsUseCase,
  MarkManualPaymentPaidUseCase,
  RefundPaymentUseCase,
  VoidPaymentUseCase,
} from '../application/payment-use-cases';
import { InvalidWebhookSignatureError, PaymentNotFoundError, TransientPaymentProviderError } from '../domain/errors';
import type { PaymentOutput } from '../application/payment.dto';

class AuthorizePaymentRequestDto {
  orderId!: string;
  providerCode!: string;
  amount!: number;
  currency!: string;
}

class RefundPaymentRequestDto {
  amount!: number;
}

@ApiTags('payments')
@Controller('payments')
@RequirePermission('payments.read')
export class PaymentsController {
  constructor(
    private readonly listMethods: ListPaymentMethodsUseCase,
    private readonly authorizePayment: AuthorizePaymentUseCase,
    private readonly capturePayment: CapturePaymentUseCase,
    private readonly voidPayment: VoidPaymentUseCase,
    private readonly markManualPaid: MarkManualPaymentPaidUseCase,
    private readonly refundPayment: RefundPaymentUseCase,
    private readonly handleWebhook: HandlePaymentWebhookUseCase,
  ) {}

  @Get('methods')
  @Public()
  @ApiOperation({ summary: 'Lista métodos de pago habilitados sin exponer secretos' })
  async methods(@Query('storeId') storeId = 'default') {
    const result = await this.listMethods.execute(storeId);
    if (result.isOk()) return result.value;
    throw new BadRequestException('No se pudieron listar métodos de pago');
  }

  @Post('authorize')
  @RequirePermission('payments.create')
  @ApiOperation({ summary: 'Crea un intento de pago y autoriza o captura según provider' })
  async authorize(@Body() body: AuthorizePaymentRequestDto, @CurrentStore() store?: ActiveStore): Promise<PaymentOutput> {
    if (!store) throw new BadRequestException('Falta tienda activa');
    return this.unwrap(await this.authorizePayment.execute({ ...body, storeId: store.id }));
  }

  @Post(':paymentId/capture')
  @RequirePermission('payments.update')
  @ApiOperation({ summary: 'Captura un pago autorizado' })
  async capture(@Param('paymentId') paymentId: string): Promise<PaymentOutput> {
    return this.unwrap(await this.capturePayment.execute({ paymentId }));
  }

  @Post(':paymentId/void')
  @RequirePermission('payments.update')
  @ApiOperation({ summary: 'Anula una autorización de pago' })
  async void(@Param('paymentId') paymentId: string): Promise<PaymentOutput> {
    return this.unwrap(await this.voidPayment.execute({ paymentId }));
  }

  @Post(':paymentId/manual-paid')
  @RequirePermission('payments.update')
  @ApiOperation({ summary: 'Marca pago manual/efectivo como pagado' })
  async manualPaid(
    @Param('paymentId') paymentId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<PaymentOutput> {
    return this.unwrap(await this.markManualPaid.execute({ paymentId, actorId: user?.id ?? '' }));
  }

  @Post(':paymentId/refunds')
  @RequirePermission('payments.refund')
  @ApiOperation({ summary: 'Solicita reembolso total o parcial' })
  async refund(@Param('paymentId') paymentId: string, @Body() body: RefundPaymentRequestDto): Promise<PaymentOutput> {
    return this.unwrap(await this.refundPayment.execute({ paymentId, amount: body.amount }));
  }

  @Post('webhooks/:providerCode')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Recibe webhooks de pago por provider' })
  async webhook(@Param('providerCode') providerCode: string, @Headers() headers: Record<string, string | string[] | undefined>, @Req() request: RawBodyRequest<{ rawBody?: Buffer }>): Promise<{ ok: true; duplicate: boolean }> {
    const rawBody = request.rawBody?.toString('utf8') ?? '';
    const result = await this.handleWebhook.execute({ providerCode, headers, rawBody });
    if (result.isOk()) return { ok: true, duplicate: result.value.duplicate };
    if (result.error instanceof InvalidWebhookSignatureError) throw new HttpException(result.error.message, HttpStatus.UNAUTHORIZED);
    if (result.error instanceof TransientPaymentProviderError) throw new HttpException(result.error.message, HttpStatus.SERVICE_UNAVAILABLE);
    throw new BadRequestException(result.error.message);
  }

  private unwrap(result: { isOk(): boolean; value?: PaymentOutput; error?: Error }): PaymentOutput {
    if (result.isOk() && result.value) return result.value;
    if (result.error instanceof PaymentNotFoundError) throw new NotFoundException(result.error.message);
    throw new BadRequestException(result.error?.message ?? 'Operación de pago inválida');
  }
}
