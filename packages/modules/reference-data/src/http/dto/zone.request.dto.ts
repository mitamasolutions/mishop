import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateZoneRequestDto {
  @ApiProperty({ description: 'Nombre de la zona' })
  name!: string;

  @ApiProperty({ description: 'Código único dentro del territorio' })
  code!: string;

  @ApiPropertyOptional({ description: 'Descripción de la zona' })
  description?: string | null;
}

export class UpdateZoneRequestDto {
  @ApiPropertyOptional({ description: 'Nombre de la zona' })
  name?: string;

  @ApiPropertyOptional({ description: 'Código único dentro del territorio' })
  code?: string;

  @ApiPropertyOptional({ description: 'Estado activo' })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Descripción de la zona' })
  description?: string | null;
}
