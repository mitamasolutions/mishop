import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class AddProductOptionRequestDto {
  @ApiProperty({ example: 'Talla' })
  @IsString()
  @MinLength(1, { message: 'El título de la opción es obligatorio' })
  title!: string;

  @ApiPropertyOptional({ type: [String], example: ['S', 'M', 'L'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  values?: string[];
}

export class UpdateProductOptionRequestDto {
  @ApiProperty({ example: 'Talla' })
  @IsString()
  @MinLength(1, { message: 'El título de la opción es obligatorio' })
  title!: string;
}

export class AddProductOptionValueRequestDto {
  @ApiProperty({ example: 'XL' })
  @IsString()
  @MinLength(1, { message: 'El valor de la opción es obligatorio' })
  value!: string;
}
