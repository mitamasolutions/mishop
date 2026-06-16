import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordRequestDto {
  @ApiProperty({ example: 'contraseña-actual' })
  @IsString()
  @MinLength(1, { message: 'La contraseña actual es obligatoria' })
  currentPassword!: string;

  @ApiProperty({ example: 'contraseña-nueva-segura' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  newPassword!: string;
}
