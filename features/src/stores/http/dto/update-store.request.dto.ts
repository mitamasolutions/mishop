import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class UpdateStoreRequestDto {
  @ApiPropertyOptional({ example: 'Tienda Centro' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio' })
  name?: string;

  @ApiPropertyOptional({ example: 'https://centro.mitienda.mx', nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'La URL no es válida' })
  url?: string | null;

  @ApiPropertyOptional({ example: 'MXN', description: 'Código ISO 4217 de la moneda' })
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiPropertyOptional({ example: 'mexico', description: 'Id de la región' })
  @IsOptional()
  @IsString()
  regionId?: string;
}
