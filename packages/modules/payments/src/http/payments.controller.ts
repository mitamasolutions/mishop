import { BadRequestException, Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, NotFoundException, Param, Post, Put, Query, RawBodyRequest, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentStore, CurrentUser, Public, RequirePermission, type ActiveStore, type AuthenticatedUser } from '@mitama/contracts';
import {
  AuthorizePaymentUseCase,
  CapturePaymentUseCase,
  ConfigureStorePaymentMethodUseCase,
  HandlePaymentWebhookUseCase,
  ListPaymentMethodsUseCase,
  ListPaymentsByOrderUseCase,
  MarkManualPaymentPaidUseCase,
  RefundPaymentUseCase,
  ResolveAvailablePaymentMethodsUseCase,
  VoidPaymentUseCase,
} from '../application/payment-use-cases';
import { InvalidWebhookSignatureError, PaymentNotFoundError, TransientPaymentProviderError } from '../domain/errors';
import { PaymentProviderRegistry } from '../domain/payment-provider';
import { PAYMENTS_TOKENS } from '../payments.tokens';
import { Inject } from '@nestjs/common';
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

class ConfigurePaymentMethodRequestDto {
  displayName?: string;
  enabled?: boolean;
  webhookSecret?: string | null;
  captureMode?: 'manual' | 'automatic';
  credentials?: Record<string, unknown>;
}

@ApiTags('payments')
@Controller('payments')
@RequirePermission('payments.read')
export class PaymentsController {
  constructor(
    private readonly listMethods: ListPaymentMethodsUseCase,
    private readonly resolveAvailableMethods: ResolveAvailablePaymentMethodsUseCase,
    private readonly listPaymentsByOrder: ListPaymentsByOrderUseCase,
    private readonly configureMethod: ConfigureStorePaymentMethodUseCase,
    private readonly authorizePayment: AuthorizePaymentUseCase,
    private readonly capturePayment: CapturePaymentUseCase,
    private readonly voidPayment: VoidPaymentUseCase,
    private readonly markManualPaid: MarkManualPaymentPaidUseCase,
    private readonly refundPayment: RefundPaymentUseCase,
    private readonly handleWebhook: HandlePaymentWebhookUseCase,
    @Inject(PAYMENTS_TOKENS.providerRegistry) private readonly providerRegistry: PaymentProviderRegistry,
  ) {}

  @Get('methods')
  @Public()
  @ApiOperation({ summary: 'Lista métodos de pago habilitados sin exponer secretos' })
  async methods(@Query('storeId') storeId = 'default') {
    const result = await this.listMethods.execute(storeId);
    if (result.isOk()) return result.value;
    throw new BadRequestException('No se pudieron listar métodos de pago');
  }

  @Get('methods/admin')
  @RequirePermission('settings.update')
  @ApiOperation({ summary: 'Admin: lista métodos con su estado configured/misconfigured + descriptor del plugin' })
  async adminMethods(@CurrentStore() store?: ActiveStore) {
    if (!store) throw new BadRequestException('Falta tienda activa');
    const available = await this.resolveAvailableMethods.execute(store.id);
    if (!available.isOk()) throw new BadRequestException('No se pudieron resolver métodos');
    // Enriquecer cada item con el descriptor del plugin para que el admin
    // renderice el formulario de configuración (r14 + r23).
    return available.value.map((entry) => {
      const provider = this.providerRegistry.get(entry.method.providerCode);
      return {
        ...entry,
        descriptor: provider?.configDescriptor ?? null,
      };
    });
  }

  @Get('methods/registered')
  @RequirePermission('settings.read')
  @ApiOperation({ summary: 'Admin: lista de plugins registrados con su descriptor (para alta nueva)' })
  async registeredProviders() {
    return this.providerRegistry.list().map((p) => ({
      code: p.code,
      displayName: p.displayName,
      descriptor: p.configDescriptor,
    }));
  }

  @Put('methods/:providerCode')
  @RequirePermission('settings.update')
  @ApiOperation({ summary: 'Admin: crea/actualiza la configuración de un método de pago por tienda' })
  async configureMethodEndpoint(
    @Param('providerCode') providerCode: string,
    @Body() body: ConfigurePaymentMethodRequestDto,
    @CurrentStore() store?: ActiveStore,
  ) {
    if (!store) throw new BadRequestException('Falta tienda activa');
    const result = await this.configureMethod.execute({ storeId: store.id, providerCode, ...body });
    if (result.isOk()) return result.value;
    throw new BadRequestException('No se pudo configurar el método');
  }

  @Get('by-order/:orderId')
  @ApiOperation({ summary: 'Lista intentos de pago de una orden (tab Pagos en admin)' })
  async listByOrder(@Param('orderId') orderId: string): Promise<PaymentOutput[]> {
    const result = await this.listPaymentsByOrder.execute(orderId);
    if (result.isOk()) return result.value;
    throw new BadRequestException('No se pudieron listar los pagos');
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

  @Post('webhooks/:storeId/:providerCode')
  @Public()
  @Throttle({ webhook: { limit: 60, ttl: 60000 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Recibe webhooks de pago por (tienda, provider)' })
  async webhook(
    @Param('storeId') storeId: string,
    @Param('providerCode') providerCode: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() request: RawBodyRequest<{ rawBody?: Buffer }>,
  ): Promise<{ ok: true; duplicate: boolean }> {
    const rawBody = request.rawBody?.toString('utf8') ?? '';
    const result = await this.handleWebhook.execute({ storeId, providerCode, headers, rawBody });
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
