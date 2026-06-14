import { BadRequestException, Body, Controller, Headers, NotFoundException, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { GiftCardCurrencyMismatchError, GiftCardNotFoundError, GiftCardNotRedeemableError, GiftCardValidationError } from '../domain/errors';
import { DisableGiftCardUseCase, IssueGiftCardUseCase, RedeemGiftCardUseCase } from '../application/gift-card-use-cases';

class IssueGiftCardRequestDto {
  @IsString()
  storeId!: string;

  @IsOptional()
  @IsString()
  code?: string | null;

  @IsNumber()
  initialBalance!: number;

  @IsString()
  currencyCode!: string;

  @IsOptional()
  @IsString()
  expiresAt?: string | null;

  @IsOptional()
  @IsString()
  issuedToCustomerId?: string | null;
}

class RedeemGiftCardRequestDto {
  @IsString()
  storeId!: string;

  @IsString()
  code!: string;

  @IsString()
  orderId!: string;

  @IsNumber()
  orderTotal!: number;

  @IsString()
  currencyCode!: string;
}

@ApiTags('giftcards')
@Controller('giftcards')
export class GiftCardsController {
  constructor(
    private readonly issueGiftCard: IssueGiftCardUseCase,
    private readonly redeemGiftCard: RedeemGiftCardUseCase,
    private readonly disableGiftCard: DisableGiftCardUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Emite una gift card' })
  async issue(@Body() body: IssueGiftCardRequestDto) {
    const result = await this.issueGiftCard.execute({ ...body, expiresAt: body.expiresAt ? new Date(body.expiresAt) : null });
    if (result.isErr()) throw new BadRequestException(result.error.message);
    return result.value;
  }

  @Post('redeem')
  @ApiOperation({ summary: 'Redime gift card de forma parcial e idempotente' })
  async redeem(@Body() body: RedeemGiftCardRequestDto, @Headers('idempotency-key') idempotencyKey?: string) {
    if (!idempotencyKey) throw new BadRequestException('El header Idempotency-Key es obligatorio');
    const result = await this.redeemGiftCard.execute({ ...body, idempotencyKey });
    if (result.isErr()) return this.handleError(result.error);
    return result.value;
  }

  @Post(':id/disable')
  @ApiOperation({ summary: 'Deshabilita una gift card' })
  async disable(@Param('id') id: string, @Body() body: { storeId: string }) {
    const result = await this.disableGiftCard.execute({ storeId: body.storeId, id });
    if (result.isErr()) return this.handleError(result.error);
    return result.value;
  }

  private handleError(error: Error): never {
    if (error instanceof GiftCardNotFoundError) throw new NotFoundException(error.message);
    if (error instanceof GiftCardValidationError || error instanceof GiftCardNotRedeemableError || error instanceof GiftCardCurrencyMismatchError) throw new BadRequestException(error.message);
    throw new BadRequestException(error.message);
  }
}
