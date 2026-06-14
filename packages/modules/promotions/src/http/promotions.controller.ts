import { BadRequestException, Body, ConflictException, Controller, Get, Headers, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '@mitama/contracts';
import { IsArray, IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';
import { CouponNotApplicableError, CouponNotFoundError, DiscountNotFoundError, NewsletterSubscriptionNotFoundError, PromotionValidationError, RewardProgramNotConfiguredError, TooManyCouponsError } from '../domain/errors';
import type { DiscountScope, DiscountType, NewsletterStatus } from '../domain/promotion.models';
import {
  AccrueRewardPointsUseCase,
  ConfigureRewardProgramUseCase,
  ConfirmNewsletterUseCase,
  CreateCouponUseCase,
  CreateDiscountUseCase,
  ExportNewsletterCsvUseCase,
  GenerateCouponsUseCase,
  PreviewPromotionsUseCase,
  RedeemCouponUseCase,
  ReverseRewardPointsUseCase,
  SubscribeNewsletterUseCase,
  UnsubscribeNewsletterUseCase,
} from '../application/promotion-use-cases';

class CreateDiscountRequestDto {
  @IsString() storeId!: string;
  @IsString() name!: string;
  @IsIn(['percentage', 'fixed']) type!: DiscountType;
  @IsNumber() @Min(0.01) value!: number;
  @IsOptional() @IsNumber() maxDiscountAmount?: number | null;
  @IsIn(['order', 'product', 'category']) scope!: DiscountScope;
  @IsArray() targetIds!: string[];
  @IsOptional() @IsObject() conditions!: { minimumSubtotal?: number | null; firstOrderOnly?: boolean; customerRoles?: string[] };
  @IsBoolean() requiresCoupon!: boolean;
  @IsBoolean() combinable!: boolean;
  @IsBoolean() active!: boolean;
  @IsOptional() @IsString() startsAt?: string | null;
  @IsOptional() @IsString() endsAt?: string | null;
}

class CreateCouponRequestDto {
  @IsString() storeId!: string;
  @IsString() discountId!: string;
  @IsString() code!: string;
  @IsBoolean() active!: boolean;
  @IsOptional() @IsNumber() globalUsageLimit?: number | null;
  @IsOptional() @IsNumber() perCustomerUsageLimit?: number | null;
  @IsOptional() @IsString() startsAt?: string | null;
  @IsOptional() @IsString() endsAt?: string | null;
}

class GenerateCouponsRequestDto extends CreateCouponRequestDto {
  @IsNumber() @Min(1) @Max(1000) quantity!: number;
}

class PreviewRequestDto {
  @IsString() storeId!: string;
  @IsString() customerId!: string;
  @IsNumber() subtotal!: number;
  @IsOptional() @IsBoolean() customerHasPreviousOrders?: boolean;
  @IsOptional() @IsString() customerRole?: string | null;
  @IsOptional() @IsArray() @IsString({ each: true }) couponCodes?: string[];
  @IsArray() lines!: Array<{ productId: string; categoryIds?: string[]; quantity: number; unitPrice: number }>;
}

class RewardConfigDto {
  @IsString() storeId!: string;
  @IsNumber() earnPointsPerCurrencyUnit!: number;
  @IsNumber() redeemCurrencyPerPoint!: number;
  @IsOptional() @IsNumber() maxRedeemPercent?: number | null;
  @IsOptional() @IsNumber() expiresAfterDays?: number | null;
}

@ApiTags('promotions')
@Controller('promotions')
@RequirePermission('promotions.read')
export class PromotionsController {
  constructor(
    private readonly createDiscount: CreateDiscountUseCase,
    private readonly createCoupon: CreateCouponUseCase,
    private readonly generateCoupons: GenerateCouponsUseCase,
    private readonly previewPromotions: PreviewPromotionsUseCase,
    private readonly redeemCoupon: RedeemCouponUseCase,
    private readonly configureRewards: ConfigureRewardProgramUseCase,
    private readonly accrueRewards: AccrueRewardPointsUseCase,
    private readonly reverseRewards: ReverseRewardPointsUseCase,
    private readonly subscribeNewsletter: SubscribeNewsletterUseCase,
    private readonly confirmNewsletter: ConfirmNewsletterUseCase,
    private readonly unsubscribeNewsletter: UnsubscribeNewsletterUseCase,
    private readonly exportNewsletter: ExportNewsletterCsvUseCase,
  ) {}

  @Post('discounts')
  @RequirePermission('promotions.create')
  @ApiOperation({ summary: 'Crea un descuento' })
  async discount(@Body() body: CreateDiscountRequestDto) {
    const result = await this.createDiscount.execute({ ...body, maxDiscountAmount: body.maxDiscountAmount ?? null, startsAt: body.startsAt ? new Date(body.startsAt) : null, endsAt: body.endsAt ? new Date(body.endsAt) : null, conditions: body.conditions ?? {} });
    if (result.isErr()) throw new BadRequestException(result.error.message);
    return result.value;
  }

  @Post('coupons')
  @RequirePermission('promotions.create')
  @ApiOperation({ summary: 'Crea un cupón normalizado' })
  async coupon(@Body() body: CreateCouponRequestDto) {
    const result = await this.createCoupon.execute(toCouponInput(body));
    if (result.isErr()) return this.handleError(result.error);
    return result.value;
  }

  @Post('coupons/bulk')
  @RequirePermission('promotions.create')
  @ApiOperation({ summary: 'Genera cupones masivos de un solo uso' })
  async bulkCoupons(@Body() body: GenerateCouponsRequestDto) {
    const result = await this.generateCoupons.execute({ ...toCouponInput(body), quantity: body.quantity });
    if (result.isErr()) return this.handleError(result.error);
    return result.value;
  }

  @Post('preview')
  @RequirePermission('promotions.read')
  @ApiOperation({ summary: 'Evalúa descuentos sin consumir cupones' })
  async preview(@Body() body: PreviewRequestDto) {
    const result = await this.previewPromotions.execute(body);
    if (result.isErr()) return this.handleError(result.error);
    return result.value;
  }

  @Post('redeem-coupon')
  @RequirePermission('promotions.redeem')
  @ApiOperation({ summary: 'Consume cupón de forma idempotente' })
  async redeem(@Body() body: PreviewRequestDto, @Headers('idempotency-key') idempotencyKey?: string) {
    if (!idempotencyKey) throw new BadRequestException('El header Idempotency-Key es obligatorio');
    const result = await this.redeemCoupon.execute({ ...body, idempotencyKey });
    if (result.isErr()) return this.handleError(result.error);
    return result.value;
  }

  @Post('reward-program')
  @RequirePermission('promotions.update')
  async rewardProgram(@Body() body: RewardConfigDto) {
    const result = await this.configureRewards.execute({ ...body, maxRedeemPercent: body.maxRedeemPercent ?? null, expiresAfterDays: body.expiresAfterDays ?? null });
    if (result.isErr()) throw new BadRequestException(result.error.message);
    return result.value;
  }

  @Post('reward-points/accrue')
  @RequirePermission('promotions.update')
  async accrue(@Body() body: { storeId: string; customerId: string; orderId: string; paidAmount: number }, @Headers('idempotency-key') idempotencyKey?: string) {
    if (!idempotencyKey) throw new BadRequestException('El header Idempotency-Key es obligatorio');
    const result = await this.accrueRewards.execute({ ...body, idempotencyKey });
    if (result.isErr()) return this.handleError(result.error);
    return result.value;
  }

  @Post('reward-points/reverse')
  @RequirePermission('promotions.update')
  async reversePoints(@Body() body: { storeId: string; customerId: string; orderId: string; points: number }) {
    return (await this.reverseRewards.execute(body)).unwrapOr({ points: 0 });
  }

  @Post('newsletter/subscribe')
  @RequirePermission('promotions.create')
  async subscribe(@Body() body: { storeId: string; email: string }) {
    const result = await this.subscribeNewsletter.execute(body);
    if (result.isErr()) throw new BadRequestException('No se pudo crear la suscripción');
    return result.value;
  }

  @Post('newsletter/confirm/:token')
  @RequirePermission('promotions.update')
  async confirm(@Param('token') token: string) {
    const result = await this.confirmNewsletter.execute({ token });
    if (result.isErr()) return this.handleError(result.error);
    return result.value;
  }

  @Post('newsletter/unsubscribe')
  @RequirePermission('promotions.update')
  async unsubscribe(@Body() body: { storeId: string; email: string }) {
    const result = await this.unsubscribeNewsletter.execute(body);
    if (result.isErr()) return this.handleError(result.error);
    return result.value;
  }

  @Get('newsletter/export.csv')
  async exportCsv(@Query('storeId') storeId: string, @Query('status') status?: NewsletterStatus): Promise<string> {
    return (await this.exportNewsletter.execute({ storeId, status })).unwrapOr('');
  }

  private handleError(error: Error): never {
    if (error instanceof DiscountNotFoundError || error instanceof CouponNotFoundError || error instanceof NewsletterSubscriptionNotFoundError) throw new NotFoundException(error.message);
    if (error instanceof TooManyCouponsError) throw new ConflictException(error.message);
    if (error instanceof CouponNotApplicableError || error instanceof PromotionValidationError || error instanceof RewardProgramNotConfiguredError) throw new BadRequestException(error.message);
    throw new BadRequestException(error.message);
  }
}

function toCouponInput(body: CreateCouponRequestDto) {
  return { ...body, globalUsageLimit: body.globalUsageLimit ?? null, perCustomerUsageLimit: body.perCustomerUsageLimit ?? null, startsAt: body.startsAt ? new Date(body.startsAt) : null, endsAt: body.endsAt ? new Date(body.endsAt) : null };
}
