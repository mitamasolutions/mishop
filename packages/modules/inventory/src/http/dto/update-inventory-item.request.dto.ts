import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateInventoryItemRequestDto {
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
}
