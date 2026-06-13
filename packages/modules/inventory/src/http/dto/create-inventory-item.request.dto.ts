import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateInventoryItemRequestDto {
  @ApiPropertyOptional({ example: 'SKU-001' })
  @IsOptional()
  @IsString()
  sku?: string | null;

  @ApiPropertyOptional({ example: 'Camiseta talla M' })
  @IsOptional()
  @IsString()
  title?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  requiresShipping?: boolean;

  @ApiPropertyOptional({ description: 'Id de la variante de catálogo asociada' })
  @IsOptional()
  @IsString()
  variantId?: string | null;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  requiredQuantity?: number;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}
