import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class AddPriceListPriceRequestDto {
  @ApiProperty({ example: 'variant-id' })
  @IsString()
  @MinLength(1, { message: 'La variante es obligatoria' })
  variantId!: string;

  @ApiProperty({ example: 'MXN' })
  @IsString()
  @MinLength(1, { message: 'La moneda es obligatoria' })
  currencyCode!: string;

  @ApiProperty({ example: 199.0 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ example: 10, description: 'Cantidad mínima (omitir para que aplique siempre)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  minQuantity?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxQuantity?: number;
}

export class UpdatePriceListPriceRequestDto {
  @ApiPropertyOptional({ example: 199.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  minQuantity?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxQuantity?: number;
}
