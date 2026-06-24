import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTerritoryRequestDto {
  @ApiProperty({ description: 'Nombre del territorio' })
  name!: string;

  @ApiProperty({ description: 'Código único dentro de la región' })
  code!: string;

  @ApiPropertyOptional({ description: 'Garantía automática al finalizar pedido' })
  automaticFulfillment?: boolean;

  @ApiPropertyOptional({ description: 'Subtotal mínimo requerido (en la moneda de la región)' })
  minSubtotal?: number | null;

  @ApiPropertyOptional({ description: 'Calcular subtotal mínimo incluyendo impuestos' })
  minSubtotalWithTax?: boolean;

  @ApiPropertyOptional({ description: 'Umbral para envío gratis (en la moneda de la región)' })
  freeShippingThreshold?: number | null;

  @ApiPropertyOptional({ description: 'Calcular umbral de envío gratis incluyendo impuestos' })
  freeShippingThresholdWithTax?: boolean;

  @ApiPropertyOptional({ description: 'Envío gratis sin descuentos aplicados' })
  freeShippingNoDiscount?: boolean;

  @ApiPropertyOptional({ description: 'Costo de envío (en la moneda de la región)' })
  shippingCost?: number | null;

  @ApiPropertyOptional({ description: 'Descripción del territorio' })
  description?: string | null;
}

export class UpdateTerritoryRequestDto {
  @ApiPropertyOptional({ description: 'Nombre del territorio' })
  name?: string;

  @ApiPropertyOptional({ description: 'Código único dentro de la región' })
  code?: string;

  @ApiPropertyOptional({ description: 'Estado activo' })
  isActive?: boolean;

  @ApiPropertyOptional()
  automaticFulfillment?: boolean;

  @ApiPropertyOptional()
  minSubtotal?: number | null;

  @ApiPropertyOptional()
  minSubtotalWithTax?: boolean;

  @ApiPropertyOptional()
  freeShippingThreshold?: number | null;

  @ApiPropertyOptional()
  freeShippingThresholdWithTax?: boolean;

  @ApiPropertyOptional()
  freeShippingNoDiscount?: boolean;

  @ApiPropertyOptional()
  shippingCost?: number | null;

  @ApiPropertyOptional()
  description?: string | null;
}
