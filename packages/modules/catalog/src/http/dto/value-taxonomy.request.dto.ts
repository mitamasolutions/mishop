import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ValueTaxonomyRequestDto {
  @ApiProperty({ example: 'Electrónica' })
  @IsString()
  @MinLength(1, { message: 'El valor es obligatorio' })
  value!: string;
}
