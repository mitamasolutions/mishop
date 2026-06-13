import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordRequestDto {
  @ApiProperty({ description: 'Token de recuperación recibido por email' })
  @IsString()
  @MinLength(1, { message: 'El token es obligatorio' })
  token!: string;

  @ApiProperty({ example: 'nueva-contraseña-segura' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  newPassword!: string;
}
