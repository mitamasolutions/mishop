import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRegionRequestDto {
  @ApiProperty({ description: 'Nombre de la región' })
  name!: string;

  @ApiProperty({ description: 'Código ISO 4217 de la moneda', example: 'MXN' })
  currencyCode!: string;
}

export class UpdateRegionRequestDto {
  @ApiPropertyOptional({ description: 'Nombre de la región' })
  name?: string;

  @ApiPropertyOptional({ description: 'Código ISO 4217 de la moneda', example: 'MXN' })
  currencyCode?: string;

  @ApiPropertyOptional({ description: 'Códigos ISO 3166-1 alfa-2 de los países asociados', type: [String] })
  countriesIso2?: string[];

  @ApiPropertyOptional({ description: 'IDs de proveedores de pago habilitados', type: [String] })
  paymentProviderIds?: string[];
}
