import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export abstract class VariantFieldsRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ean?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  upc?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowBackorder?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  manageInventory?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @ApiPropertyOptional({ description: 'Fecha de inicio de la oferta (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  saleStartsAt?: string;

  @ApiPropertyOptional({ description: 'Fecha de fin de la oferta (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  saleEndsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  length?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ description: 'Orden entre variantes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  variantRank?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class AddVariantRequestDto extends VariantFieldsRequestDto {
  @ApiProperty({ example: 'Camiseta básica - M / Rojo' })
  @IsString()
  @MinLength(1, { message: 'El título de la variante es obligatorio' })
  title!: string;

  @ApiProperty({ example: 'CAM-001-M-ROJO' })
  @IsString()
  @MinLength(1, { message: 'El SKU de la variante es obligatorio' })
  sku!: string;

  @ApiPropertyOptional({ type: [String], description: 'Ids de los valores de opción que define esta variante' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionValueIds?: string[];
}

export class UpdateVariantRequestDto extends VariantFieldsRequestDto {
  @ApiPropertyOptional({ example: 'Camiseta básica - M / Rojo' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El título de la variante es obligatorio' })
  title?: string;

  @ApiPropertyOptional({ example: 'CAM-001-M-ROJO' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El SKU de la variante es obligatorio' })
  sku?: string;

  @ApiPropertyOptional({ type: [String], description: 'Ids de los valores de opción que define esta variante' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionValueIds?: string[];
}
