import { ApiPropertyOptional } from '@nestjs/swagger';
import { PERMISSIONS } from '@mitama/contracts';
import { ArrayUnique, IsArray, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateRoleRequestDto {
  @ApiPropertyOptional({ example: 'Operador de tienda' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio' })
  name?: string;

  @ApiPropertyOptional({ enum: PERMISSIONS, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(PERMISSIONS, { each: true, message: 'Permiso no reconocido' })
  permissions?: string[];
}
