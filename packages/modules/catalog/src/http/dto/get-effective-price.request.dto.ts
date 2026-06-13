import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class GetEffectivePriceRequestDto {
  @ApiProperty({ example: 'MXN' })
  @IsString()
  @MinLength(1, { message: 'La moneda es obligatoria' })
  currencyCode!: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Fecha de referencia (ISO 8601); por defecto, ahora' })
  @IsOptional()
  @IsDateString()
  at?: string;
}
