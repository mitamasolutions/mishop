import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { DuplicateReviewError, ReviewNotEditableError, ReviewNotFoundError, ReviewValidationError, VerifiedPurchaseRequiredError } from '../domain/errors';
import type { ReviewStatus } from '../domain/review.models';
import { CreateReviewUseCase, EditPendingReviewUseCase, GetProductRatingUseCase, ListProductReviewsUseCase, ModerateReviewUseCase } from '../application/review-use-cases';

class CreateReviewRequestDto {
  @IsString() storeId!: string;
  @IsString() productId!: string;
  @IsString() customerId!: string;
  @IsNumber() rating!: number;
  @IsOptional() @IsString() title?: string | null;
  @IsString() body!: string;
}

class EditReviewRequestDto {
  @IsString() storeId!: string;
  @IsOptional() @IsNumber() rating?: number;
  @IsOptional() @IsString() title?: string | null;
  @IsOptional() @IsString() body?: string;
}

class ModerateReviewRequestDto {
  @IsString() storeId!: string;
  @IsIn(['approved', 'rejected']) status!: 'approved' | 'rejected';
  @IsString() moderatorId!: string;
  @IsOptional() @IsString() reason?: string | null;
}

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly createReview: CreateReviewUseCase,
    private readonly editReview: EditPendingReviewUseCase,
    private readonly moderateReview: ModerateReviewUseCase,
    private readonly getRating: GetProductRatingUseCase,
    private readonly listReviews: ListProductReviewsUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crea review pendiente para compra verificada' })
  async create(@Body() body: CreateReviewRequestDto) {
    const result = await this.createReview.execute(body);
    if (result.isErr()) return this.handleError(result.error);
    return result.value;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita una review mientras está pendiente' })
  async edit(@Param('id') id: string, @Body() body: EditReviewRequestDto) {
    const result = await this.editReview.execute({ id, ...body });
    if (result.isErr()) return this.handleError(result.error);
    return result.value;
  }

  @Post(':id/moderate')
  @ApiOperation({ summary: 'Aprueba o rechaza una review' })
  async moderate(@Param('id') id: string, @Body() body: ModerateReviewRequestDto) {
    const result = await this.moderateReview.execute({ id, ...body });
    if (result.isErr()) return this.handleError(result.error);
    return result.value;
  }

  @Get('products/:productId')
  async list(@Param('productId') productId: string, @Query('storeId') storeId: string, @Query('status') status?: ReviewStatus) {
    return (await this.listReviews.execute({ storeId, productId, status })).unwrapOr([]);
  }

  @Get('products/:productId/rating')
  async rating(@Param('productId') productId: string, @Query('storeId') storeId: string) {
    return (await this.getRating.execute({ storeId, productId })).unwrapOr({ storeId, productId, averageRating: 0, reviewCount: 0 });
  }

  private handleError(error: Error): never {
    if (error instanceof ReviewNotFoundError) throw new NotFoundException(error.message);
    if (error instanceof ReviewValidationError || error instanceof VerifiedPurchaseRequiredError || error instanceof DuplicateReviewError || error instanceof ReviewNotEditableError) throw new BadRequestException(error.message);
    throw new BadRequestException(error.message);
  }
}
