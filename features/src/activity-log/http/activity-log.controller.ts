import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentStore, NoStoreScope, RequirePermission, type ActiveStore } from '@mitama/contracts';
import { DEFAULT_PAGE_SIZE, ListActivityLogUseCase } from '../application/list-activity-log/list-activity-log.use-case';
import type { ListActivityLogOutput } from '../application/list-activity-log/list-activity-log.dto';
import { ListActivityLogRequestDto } from './dto/list-activity-log.request.dto';

@ApiTags('activity-log')
@Controller('activity-log')
export class ActivityLogController {
  constructor(private readonly listActivityLog: ListActivityLogUseCase) {}

  @Get('global')
  @NoStoreScope()
  @RequirePermission('activity-log.read')
  @ApiOperation({ summary: 'Lista el log de actividad de todas las tiendas (Super Admin)' })
  @ApiOkResponse({ description: 'Página del log de actividad' })
  async listGlobal(@Query() query: ListActivityLogRequestDto): Promise<ListActivityLogOutput> {
    const result = await this.listActivityLog.execute(this.toInput(query));
    return result.unwrapOr(this.emptyPage(query));
  }

  @Get()
  @RequirePermission('activity-log.read')
  @ApiOperation({ summary: 'Lista el log de actividad de la tienda activa' })
  @ApiOkResponse({ description: 'Página del log de actividad' })
  async list(@Query() query: ListActivityLogRequestDto, @CurrentStore() store?: ActiveStore): Promise<ListActivityLogOutput> {
    const result = await this.listActivityLog.execute({ ...this.toInput(query), storeId: store?.id ?? null });
    return result.unwrapOr(this.emptyPage(query));
  }

  private toInput(query: ListActivityLogRequestDto) {
    return {
      userId: query.userId,
      entityType: query.entityType,
      action: query.action,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  private emptyPage(query: ListActivityLogRequestDto): ListActivityLogOutput {
    return { items: [], total: 0, page: query.page ?? 1, pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE };
  }
}
