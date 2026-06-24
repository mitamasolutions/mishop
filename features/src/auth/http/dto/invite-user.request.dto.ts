import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class InviteUserRequestDto {
  @ApiProperty({ example: 'usuario@ejemplo.mx' })
  @IsEmail({}, { message: 'El email no es válido' })
  email!: string;

  @ApiProperty({ example: 'Nuevo Usuario' })
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio' })
  name!: string;

  @ApiProperty({ description: 'Id del rol a asignar' })
  @IsUUID()
  roleId!: string;

  @ApiPropertyOptional({ description: 'Id de la tienda; omitir solo para el rol Super Admin' })
  @IsOptional()
  @IsUUID()
  storeId?: string;
}
