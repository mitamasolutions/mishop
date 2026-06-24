import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AcceptInvitationRequestDto {
  @ApiProperty({ description: 'Token de invitación recibido por email' })
  @IsString()
  @MinLength(1, { message: 'El token es obligatorio' })
  token!: string;

  @ApiProperty({ example: 'contraseña-segura' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;
}
