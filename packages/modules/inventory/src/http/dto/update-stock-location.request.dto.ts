import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateStockLocationRequestDto {
  @ApiPropertyOptional({ example: 'Almacén central' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio' })
  name?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}
