import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateCollectionRequestDto {
  @ApiPropertyOptional({ example: 'Novedades' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El título no puede estar vacío' })
  title?: string;

  @ApiPropertyOptional({ example: 'novedades' })
  @IsOptional()
  @IsString()
  handle?: string;
}
