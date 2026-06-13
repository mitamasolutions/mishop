import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class AddSpecificationRequestDto {
  @ApiProperty({ example: 'Material' })
  @IsString()
  @MinLength(1, { message: 'El nombre de la especificación es obligatorio' })
  name!: string;

  @ApiProperty({ example: '100% algodón' })
  @IsString()
  @MinLength(1, { message: 'El valor de la especificación es obligatorio' })
  value!: string;

  @ApiPropertyOptional({ description: 'Orden entre especificaciones' })
  @IsOptional()
  @IsInt()
  @Min(0)
  rank?: number;
}

export class UpdateSpecificationRequestDto {
  @ApiPropertyOptional({ example: 'Material' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El nombre de la especificación es obligatorio' })
  name?: string;

  @ApiPropertyOptional({ example: '100% algodón' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El valor de la especificación es obligatorio' })
  value?: string;

  @ApiPropertyOptional({ description: 'Orden entre especificaciones' })
  @IsOptional()
  @IsInt()
  @Min(0)
  rank?: number;
}
