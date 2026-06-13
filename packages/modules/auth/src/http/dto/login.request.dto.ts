import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({ example: 'admin@mitama.local' })
  @IsEmail({}, { message: 'El email no es válido' })
  email!: string;

  @ApiProperty({ example: 'contraseña-segura' })
  @IsString()
  @MinLength(1, { message: 'La contraseña es obligatoria' })
  password!: string;
}
