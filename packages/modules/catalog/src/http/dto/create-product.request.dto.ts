import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import type { ProductStatus } from '../../domain/product.entity';

const PRODUCT_STATUSES: ProductStatus[] = ['draft', 'proposed', 'published', 'rejected'];

export class CreateProductRequestDto {
  @ApiProperty({ example: 'Camiseta básica' })
  @IsString()
  @MinLength(1, { message: 'El título es obligatorio' })
  title!: string;

  @ApiPropertyOptional({ example: 'camiseta-basica', description: 'Slug único; se autogenera del título si se omite' })
  @IsOptional()
  @IsString()
  handle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: PRODUCT_STATUSES, default: 'draft' })
  @IsOptional()
  @IsIn(PRODUCT_STATUSES)
  status?: ProductStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isGiftcard?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  discountable?: boolean;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'Id del tipo de producto' })
  @IsOptional()
  @IsString()
  typeId?: string;

  @ApiPropertyOptional({ description: 'Id de la marca' })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  collectionIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  salesChannelIds?: string[];

  @ApiProperty({ example: 'CAM-001', description: 'SKU de la variante por defecto (producto simple)' })
  @IsString()
  @MinLength(1, { message: 'El SKU de la variante por defecto es obligatorio' })
  defaultVariantSku!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultVariantTitle?: string;
}
