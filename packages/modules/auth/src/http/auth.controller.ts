import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RegisterUserUseCase } from '../application/register-user/register-user.use-case';
import type { RegisterUserOutput } from '../application/register-user/register-user.dto';
import { EmailAlreadyInUseError } from '../domain/errors';
import { RegisterUserRequestDto } from './dto/register-user.request.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly registerUser: RegisterUserUseCase) {}

  @Post('register')
  @ApiOperation({ summary: 'Registra un usuario nuevo' })
  @ApiCreatedResponse({ description: 'Usuario registrado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({ description: 'El email ya está registrado' })
  async register(@Body() body: RegisterUserRequestDto): Promise<RegisterUserOutput> {
    const result = await this.registerUser.execute(body);
    if (result.isErr()) {
      if (result.error instanceof EmailAlreadyInUseError) {
        throw new ConflictException(result.error.message);
      }
      throw new BadRequestException(result.error.message);
    }
    return result.value;
  }
}
