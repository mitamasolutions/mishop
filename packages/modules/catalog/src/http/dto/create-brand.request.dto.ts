import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateBrandRequestDto {
  @ApiProperty({ example: 'Nike' })
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio' })
  name!: string;

  @ApiPropertyOptional({ example: 'nike', description: 'Slug único; se autogenera del nombre si se omite' })
  @IsOptional()
  @IsString()
  handle?: string;

  @ApiPropertyOptional({ example: 'https://cdn.mitienda.mx/marcas/nike.png' })
  @IsOptional()
  @IsUrl({}, { message: 'La URL del logo no es válida' })
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string;
}
