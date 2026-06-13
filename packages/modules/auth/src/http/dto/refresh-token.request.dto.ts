import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenRequestDto {
  @ApiProperty({ description: 'Refresh token opaco emitido en el login anterior' })
  @IsString()
  @MinLength(1, { message: 'El refresh token es obligatorio' })
  refreshToken!: string;
}
