import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSalesChannelRequestDto {
  @ApiProperty({ example: 'Tienda en línea' })
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio' })
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
