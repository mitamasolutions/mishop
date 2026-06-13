import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordRequestDto {
  @ApiProperty({ example: 'usuario@ejemplo.mx' })
  @IsEmail({}, { message: 'El email no es válido' })
  email!: string;
}
