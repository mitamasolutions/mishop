import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateCategoryRequestDto {
  @ApiProperty({ example: 'Ropa' })
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio' })
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'ropa', description: 'Slug único; se autogenera del nombre si se omite' })
  @IsOptional()
  @IsString()
  handle?: string;

  @ApiPropertyOptional({ description: 'Id de la categoría padre; raíz si se omite' })
  @IsOptional()
  @IsString()
  parentCategoryId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @ApiPropertyOptional({ description: 'Orden entre hermanos' })
  @IsOptional()
  @IsInt()
  @Min(0)
  rank?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string;
}
