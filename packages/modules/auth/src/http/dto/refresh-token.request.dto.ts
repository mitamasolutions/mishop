import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

/**
 * El refresh token viaja por defecto en la cookie HttpOnly `mitama_refresh`
 * (r22 · sprint1_cierre). El campo del body se mantiene **opcional** para
 * clientes server-to-server o tests heredados.
 */
export class RefreshTokenRequestDto {
  @ApiPropertyOptional({
    description: 'Refresh token opaco. Opcional: por defecto se lee de la cookie HttpOnly `mitama_refresh`.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El refresh token no puede ser vacío si se envía' })
  refreshToken?: string;
}
