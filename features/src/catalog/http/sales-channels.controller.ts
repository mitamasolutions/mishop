import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, RequirePermission, type AuthenticatedUser } from '@mitama/contracts';
import { CreateSalesChannelUseCase } from '../application/create-sales-channel/create-sales-channel.use-case';
import { UpdateSalesChannelUseCase } from '../application/update-sales-channel/update-sales-channel.use-case';
import { SetSalesChannelStatusUseCase } from '../application/set-sales-channel-status/set-sales-channel-status.use-case';
import { ListSalesChannelsUseCase } from '../application/list-sales-channels/list-sales-channels.use-case';
import { GetSalesChannelUseCase } from '../application/get-sales-channel/get-sales-channel.use-case';
import type { SalesChannelOutput } from '../application/sales-channel.dto';
import { SalesChannelNotFoundError } from '../domain/errors';
import { CreateSalesChannelRequestDto } from './dto/create-sales-channel.request.dto';
import { UpdateSalesChannelRequestDto } from './dto/update-sales-channel.request.dto';
import { SetSalesChannelStatusRequestDto } from './dto/set-sales-channel-status.request.dto';

@ApiTags('catalog-sales-channels')
@Controller('catalog/sales-channels')
@RequirePermission('sales-channels.read')
export class SalesChannelsController {
  constructor(
    private readonly createChannel: CreateSalesChannelUseCase,
    private readonly updateChannel: UpdateSalesChannelUseCase,
    private readonly setChannelStatus: SetSalesChannelStatusUseCase,
    private readonly listChannels: ListSalesChannelsUseCase,
    private readonly getChannel: GetSalesChannelUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista los canales de venta' })
  @ApiOkResponse({ description: 'Listado de canales de venta' })
  async list(): Promise<SalesChannelOutput[]> {
    const result = await this.listChannels.execute();
    return result.unwrapOr([]);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un canal de venta por id' })
  @ApiOkResponse({ description: 'Canal de venta encontrado' })
  @ApiNotFoundResponse({ description: 'El canal de venta no existe' })
  async get(@Param('id') id: string): Promise<SalesChannelOutput> {
    const result = await this.getChannel.execute(id);
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return result.value;
  }

  @Post()
  @RequirePermission('sales-channels.create')
  @ApiOperation({ summary: 'Crea un canal de venta' })
  @ApiCreatedResponse({ description: 'Canal de venta creado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  async create(
    @Body() body: CreateSalesChannelRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<SalesChannelOutput> {
    const result = await this.createChannel.execute({ ...body, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      throw new BadRequestException(result.error.message);
    }
    return result.value;
  }

  @Patch(':id')
  @RequirePermission('sales-channels.update')
  @ApiOperation({ summary: 'Actualiza un canal de venta' })
  @ApiOkResponse({ description: 'Canal de venta actualizado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'El canal de venta no existe' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateSalesChannelRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<SalesChannelOutput> {
    const result = await this.updateChannel.execute({ id, ...body, actorUserId: user?.id ?? null });
    if (result.isErr()) {
      const error = result.error;
      if (error instanceof SalesChannelNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
    return result.value;
  }

  @Patch(':id/status')
  @RequirePermission('sales-channels.update')
  @ApiOperation({ summary: 'Activa o desactiva un canal de venta' })
  @ApiOkResponse({ description: 'Estado actualizado' })
  @ApiNotFoundResponse({ description: 'El canal de venta no existe' })
  async setStatus(
    @Param('id') id: string,
    @Body() body: SetSalesChannelStatusRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<SalesChannelOutput> {
    const result = await this.setChannelStatus.execute({
      id,
      isActive: body.isActive,
      actorUserId: user?.id ?? null,
    });
    if (result.isErr()) {
      throw new NotFoundException(result.error.message);
    }
    return result.value;
  }
}
