import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentStore,
  CurrentUser,
  NoStoreScope,
  RequirePermission,
  type ActiveStore,
  type AuthenticatedUser,
} from '@mitama/contracts';
import { GetSettingUseCase } from '../application/get-setting/get-setting.use-case';
import { ListSettingsUseCase } from '../application/list-settings/list-settings.use-case';
import { UpdateSettingUseCase } from '../application/update-setting/update-setting.use-case';
import type { SettingOutput } from '../application/setting.dto';
import type { SettingValue } from '../domain/settings-catalog';
import { InvalidSettingValueError, UnknownSettingKeyError } from '../domain/errors';
import { UpdateSettingRequestDto } from './dto/update-setting.request.dto';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly getSetting: GetSettingUseCase,
    private readonly listSettings: ListSettingsUseCase,
    private readonly updateSetting: UpdateSettingUseCase,
  ) {}

  @Get('global')
  @NoStoreScope()
  @RequirePermission('settings.read')
  @ApiOperation({ summary: 'Lista los valores globales del catálogo de configuración' })
  @ApiOkResponse({ description: 'Listado de configuraciones globales' })
  async listGlobal(): Promise<SettingOutput[]> {
    const result = await this.listSettings.execute({ storeId: null });
    return result.unwrapOr([]);
  }

  @Patch('global/:key')
  @NoStoreScope()
  @RequirePermission('settings.update')
  @ApiOperation({ summary: 'Actualiza el valor global de una clave de configuración' })
  @ApiOkResponse({ description: 'Configuración actualizada' })
  @ApiBadRequestResponse({ description: 'Valor inválido para el tipo de la clave' })
  @ApiNotFoundResponse({ description: 'La clave no existe en el catálogo' })
  async updateGlobal(
    @Param('key') key: string,
    @Body() body: UpdateSettingRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<SettingOutput> {
    return this.applyUpdate(key, body.value as SettingValue, null, user);
  }

  @Get()
  @RequirePermission('settings.read')
  @ApiOperation({ summary: 'Lista el catálogo de configuración con sus valores efectivos para la tienda activa' })
  @ApiOkResponse({ description: 'Listado de configuraciones' })
  async list(@CurrentStore() store?: ActiveStore): Promise<SettingOutput[]> {
    const result = await this.listSettings.execute({ storeId: store?.id ?? null });
    return result.unwrapOr([]);
  }

  @Patch(':key')
  @RequirePermission('settings.update')
  @ApiOperation({ summary: 'Actualiza el override de una clave de configuración para la tienda activa' })
  @ApiOkResponse({ description: 'Configuración actualizada' })
  @ApiBadRequestResponse({ description: 'Valor inválido para el tipo de la clave' })
  @ApiNotFoundResponse({ description: 'La clave no existe en el catálogo' })
  async update(
    @Param('key') key: string,
    @Body() body: UpdateSettingRequestDto,
    @CurrentStore() store?: ActiveStore,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<SettingOutput> {
    return this.applyUpdate(key, body.value as SettingValue, store?.id ?? null, user);
  }

  private async applyUpdate(
    key: string,
    value: SettingValue,
    storeId: string | null,
    user?: AuthenticatedUser,
  ): Promise<SettingOutput> {
    const result = await this.updateSetting.execute({ actorUserId: user?.id ?? '', key, storeId, value });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof UnknownSettingKeyError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof InvalidSettingValueError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException((error as Error).message);
    }

    const getResult = await this.getSetting.execute({ key, storeId });
    if (getResult.isErr()) {
      throw new NotFoundException(getResult.error.message);
    }
    return getResult.value;
  }
}
