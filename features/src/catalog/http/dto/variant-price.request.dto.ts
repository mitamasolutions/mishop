import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class SetVariantBasePriceRequestDto {
  @ApiProperty({ example: 'MXN' })
  @IsString()
  @MinLength(1, { message: 'La moneda es obligatoria' })
  currencyCode!: string;

  @ApiProperty({ example: 299.0 })
  @IsNumber()
  @Min(0)
  amount!: number;
}

export class AddVariantTierPriceRequestDto {
  @ApiProperty({ example: 'MXN' })
  @IsString()
  @MinLength(1, { message: 'La moneda es obligatoria' })
  currencyCode!: string;

  @ApiProperty({ example: 249.0 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ example: 10, description: 'Cantidad mínima para aplicar este precio' })
  @IsInt()
  @Min(1)
  minQuantity!: number;

  @ApiPropertyOptional({ example: 50, description: 'Cantidad máxima (sin límite si se omite)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxQuantity?: number;
}

export class UpdateVariantTierPriceRequestDto {
  @ApiPropertyOptional({ example: 'MXN' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'La moneda es obligatoria' })
  currencyCode?: string;

  @ApiPropertyOptional({ example: 249.0 })
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
