import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateStoreRequestDto {
  @ApiProperty({ example: 'Tienda Centro' })
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio' })
  name!: string;

  @ApiProperty({ example: 'centro', description: 'Código único de la tienda' })
  @IsString()
  @MinLength(1, { message: 'El código es obligatorio' })
  code!: string;

  @ApiPropertyOptional({ example: 'https://centro.mitienda.mx' })
  @IsOptional()
  @IsUrl({}, { message: 'La URL no es válida' })
  url?: string;

  @ApiProperty({ example: 'MXN', description: 'Código ISO 4217 de la moneda' })
  @IsString()
  currencyCode!: string;

  @ApiProperty({ example: 'mexico', description: 'Id de la región' })
  @IsString()
  regionId!: string;
}
