import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  HttpCode,
  NotFoundException,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AllowAuthenticated, CurrentUser, NoStoreScope, Public, type AuthenticatedUser } from '@mitama/contracts';
import { LoginUseCase } from '../application/login/login.use-case';
import { RefreshSessionUseCase } from '../application/refresh-session/refresh-session.use-case';
import { LogoutUseCase } from '../application/logout/logout.use-case';
import { RequestPasswordResetUseCase } from '../application/request-password-reset/request-password-reset.use-case';
import { ResetPasswordUseCase } from '../application/reset-password/reset-password.use-case';
import { AcceptInvitationUseCase } from '../application/accept-invitation/accept-invitation.use-case';
import { ChangePasswordUseCase } from '../application/change-password/change-password.use-case';
import type { LoginOutput } from '../application/login/login.dto';
import type { RefreshSessionOutput } from '../application/refresh-session/refresh-session.dto';
import {
  AccountDisabledError,
  AccountLockedError,
  InvalidCredentialsError,
  InvalidOrExpiredTokenError,
  PasswordReuseError,
  UserNotFoundError,
} from '../domain/errors';
import { ValidationError } from '@mitama/core';
import { LoginRequestDto } from './dto/login.request.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token.request.dto';
import { ForgotPasswordRequestDto } from './dto/forgot-password.request.dto';
import { ResetPasswordRequestDto } from './dto/reset-password.request.dto';
import { AcceptInvitationRequestDto } from './dto/accept-invitation.request.dto';
import { ChangePasswordRequestDto } from './dto/change-password.request.dto';
import { clearRefreshCookie, readRefreshToken, setRefreshCookie } from './refresh-cookie';

interface RequestWithIp {
  ip?: string;
  cookies?: Record<string, string | undefined>;
}

@ApiTags('auth')
@Controller('auth')
@NoStoreScope()
export class AuthController {
  constructor(
    private readonly login: LoginUseCase,
    private readonly refreshSession: RefreshSessionUseCase,
    private readonly logout: LogoutUseCase,
    private readonly requestPasswordReset: RequestPasswordResetUseCase,
    private readonly resetPassword: ResetPasswordUseCase,
    private readonly acceptInvitation: AcceptInvitationUseCase,
    private readonly changePassword: ChangePasswordUseCase,
  ) {}

  @Post('login')
  @Public()
  @Throttle({ auth: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Inicia sesión con email y contraseña' })
  @ApiOkResponse({ description: 'Sesión iniciada' })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
  async loginHandler(
    @Body() body: LoginRequestDto,
    @Req() req: RequestWithIp,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Omit<LoginOutput, 'refreshToken'>> {
    const result = await this.login.execute({ email: body.email, password: body.password, ip: req.ip ?? null });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof AccountLockedError || error instanceof AccountDisabledError) {
        throw new ForbiddenException(error.message);
      }
      throw new UnauthorizedException(error.message);
    }
    // El refresh token se entrega solo en cookie HttpOnly (r22 · sprint1_cierre);
    // nunca cruza el borde JSON-visible al cliente.
    const { refreshToken, ...publicOutput } = result.value;
    setRefreshCookie(res, refreshToken);
    return publicOutput;
  }

  @Post('refresh')
  @Public()
  @Throttle({ auth: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Rota el refresh token y emite un nuevo access token' })
  @ApiOkResponse({ description: 'Sesión renovada' })
  @ApiUnauthorizedResponse({ description: 'El refresh token es inválido o expiró' })
  async refresh(
    @Body() body: RefreshTokenRequestDto,
    @Req() req: RequestWithIp,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Omit<RefreshSessionOutput, 'refreshToken'>> {
    const refreshToken = readRefreshToken(req, body.refreshToken);
    if (!refreshToken) {
      throw new UnauthorizedException('Sesión expirada');
    }
    const result = await this.refreshSession.execute({ refreshToken, ip: req.ip ?? null });
    if (result.isErr()) {
      // Limpiamos la cookie si el refresh estaba comprometido o vencido.
      clearRefreshCookie(res);
      throw new UnauthorizedException(result.error.message);
    }
    setRefreshCookie(res, result.value.refreshToken);
    return { accessToken: result.value.accessToken };
  }

  @Post('logout')
  @AllowAuthenticated()
  @HttpCode(204)
  @ApiOperation({ summary: 'Cierra la sesión, revocando la familia del refresh token' })
  @ApiOkResponse({ description: 'Sesión cerrada' })
  async logoutHandler(
    @Body() body: RefreshTokenRequestDto,
    @Req() req: RequestWithIp,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const refreshToken = readRefreshToken(req, body.refreshToken);
    if (refreshToken) {
      await this.logout.execute({ refreshToken, ip: req.ip ?? null });
    }
    clearRefreshCookie(res);
  }

  @Post('forgot-password')
  @Public()
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @HttpCode(204)
  @ApiOperation({ summary: 'Solicita un enlace de recuperación de contraseña' })
  @ApiOkResponse({ description: 'Solicitud procesada (siempre, exista o no la cuenta)' })
  async forgotPassword(@Body() body: ForgotPasswordRequestDto): Promise<void> {
    await this.requestPasswordReset.execute({ email: body.email });
  }

  @Post('reset-password')
  @Public()
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @HttpCode(204)
  @ApiOperation({ summary: 'Restablece la contraseña con un token de recuperación' })
  @ApiOkResponse({ description: 'Contraseña actualizada' })
  @ApiBadRequestResponse({ description: 'Token inválido, expirado, o contraseña reutilizada' })
  async resetPasswordHandler(@Body() body: ResetPasswordRequestDto): Promise<void> {
    const result = await this.resetPassword.execute({ token: body.token, newPassword: body.newPassword });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof InvalidOrExpiredTokenError) {
        throw new UnauthorizedException(error.message);
      }
      if (error instanceof PasswordReuseError) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  @Post('accept-invitation')
  @Public()
  @HttpCode(204)
  @ApiOperation({ summary: 'Acepta una invitación y activa la cuenta' })
  @ApiOkResponse({ description: 'Cuenta activada' })
  @ApiBadRequestResponse({ description: 'Token inválido o expirado' })
  async acceptInvitationHandler(@Body() body: AcceptInvitationRequestDto): Promise<void> {
    const result = await this.acceptInvitation.execute({ token: body.token, password: body.password });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof InvalidOrExpiredTokenError) {
        throw new UnauthorizedException(error.message);
      }
      if (error instanceof UserNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  @Post('change-password')
  @AllowAuthenticated()
  @HttpCode(204)
  @ApiOperation({ summary: 'Cambia la contraseña del usuario autenticado' })
  @ApiOkResponse({ description: 'Contraseña actualizada' })
  @ApiUnauthorizedResponse({ description: 'No autenticado o contraseña actual incorrecta' })
  async changePasswordHandler(
    @Body() body: ChangePasswordRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('No autenticado');
    }

    const result = await this.changePassword.execute({
      userId: user.id,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof UserNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException(error.message);
      }
      if (error instanceof PasswordReuseError) {
        throw new ConflictException(error.message);
      }
      if (error instanceof ValidationError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException((error as Error).message);
    }
  }
}
