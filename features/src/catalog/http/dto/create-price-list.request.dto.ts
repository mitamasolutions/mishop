import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import type { PriceListStatus, PriceListType } from '../../domain/price-list.entity';

const PRICE_LIST_STATUSES: PriceListStatus[] = ['draft', 'active'];
const PRICE_LIST_TYPES: PriceListType[] = ['sale', 'override'];

export class CreatePriceListRequestDto {
  @ApiProperty({ example: 'Venta de verano' })
  @IsString()
  @MinLength(1, { message: 'El título de la lista de precios es obligatorio' })
  title!: string;

  @ApiPropertyOptional({ example: 'Descuentos de temporada' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: PRICE_LIST_STATUSES, default: 'draft' })
  @IsOptional()
  @IsIn(PRICE_LIST_STATUSES)
  status?: PriceListStatus;

  @ApiPropertyOptional({ enum: PRICE_LIST_TYPES, default: 'sale' })
  @IsOptional()
  @IsIn(PRICE_LIST_TYPES)
  type?: PriceListType;

  @ApiPropertyOptional({ description: 'Fecha de inicio (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ description: 'Fecha de fin (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
