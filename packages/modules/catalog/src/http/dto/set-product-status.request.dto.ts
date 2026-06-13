import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { ProductStatus } from '../../domain/product.entity';

const PRODUCT_STATUSES: ProductStatus[] = ['draft', 'proposed', 'published', 'rejected'];

export class SetProductStatusRequestDto {
  @ApiProperty({ enum: PRODUCT_STATUSES })
  @IsIn(PRODUCT_STATUSES)
  status!: ProductStatus;
}
