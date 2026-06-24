import { ApiProperty } from '@nestjs/swagger';
import { PERMISSIONS } from '@mitama/contracts';
import { ArrayUnique, IsArray, IsIn, IsString, MinLength } from 'class-validator';

export class CreateRoleRequestDto {
  @ApiProperty({ example: 'Operador de tienda' })
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio' })
  name!: string;

  @ApiProperty({ enum: PERMISSIONS, isArray: true })
  @IsArray()
  @ArrayUnique()
  @IsIn(PERMISSIONS, { each: true, message: 'Permiso no reconocido' })
  permissions!: string[];
}
