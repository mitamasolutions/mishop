import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

export class MoveCategoryRequestDto {
  @ApiProperty({ nullable: true, example: null, description: 'Id de la nueva categoría padre; null para mover a la raíz' })
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsString()
  parentCategoryId!: string | null;

  @ApiProperty({ description: 'Orden entre hermanos en la nueva ubicación' })
  @IsInt()
  @Min(0)
  rank!: number;
}
