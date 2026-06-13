import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class UpdateBrandRequestDto {
  @ApiPropertyOptional({ example: 'Nike' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El nombre no puede estar vacío' })
  name?: string;

  @ApiPropertyOptional({ example: 'nike' })
  @IsOptional()
  @IsString()
  handle?: string;

  @ApiPropertyOptional()
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
