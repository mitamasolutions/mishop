import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import type { PriceListStatus } from '../../domain/price-list.entity';

const PRICE_LIST_STATUSES: PriceListStatus[] = ['draft', 'active'];

export class ListPriceListsRequestDto {
  @ApiPropertyOptional({ enum: PRICE_LIST_STATUSES })
  @IsOptional()
  @IsIn(PRICE_LIST_STATUSES)
  status?: PriceListStatus;

  @ApiPropertyOptional({ description: 'Número de página (1-indexado)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Tamaño de página', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
