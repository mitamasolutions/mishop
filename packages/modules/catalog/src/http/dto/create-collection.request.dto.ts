import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCollectionRequestDto {
  @ApiProperty({ example: 'Novedades' })
  @IsString()
  @MinLength(1, { message: 'El título es obligatorio' })
  title!: string;

  @ApiPropertyOptional({ example: 'novedades', description: 'Slug único; se autogenera del título si se omite' })
  @IsOptional()
  @IsString()
  handle?: string;
}
