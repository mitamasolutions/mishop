import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NoStoreScope, RequireSuperAdmin } from '@mitama/contracts';
import {
  ListScheduledTasksUseCase,
  RunDueScheduledTasksUseCase,
  UpdateScheduledTaskUseCase,
} from '../application/scheduled-task.use-cases';

interface UpdateScheduledTaskDto {
  seconds?: number;
  enabled?: boolean;
  stopOnError?: boolean;
}

/**
 * Administración de tareas programadas (r24 · sprint1_cierre).
 * Exclusivo para Super Admin: estas tareas son cross-store y tocan el
 * pulso de la plataforma (outbox, emails, reservas).
 */
@ApiTags('scheduled-tasks')
@Controller('scheduled-tasks')
@NoStoreScope()
@RequireSuperAdmin()
export class ScheduledTasksController {
  constructor(
    private readonly list: ListScheduledTasksUseCase,
    private readonly update: UpdateScheduledTaskUseCase,
    private readonly runDue: RunDueScheduledTasksUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista todas las tareas programadas con su último resultado' })
  async listAll() {
    return this.list.execute();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza intervalo / enabled / stopOnError de una tarea' })
  async patch(@Param('id') id: string, @Body() body: UpdateScheduledTaskDto) {
    const updated = await this.update.execute(id, body);
    if (!updated) throw new NotFoundException('Tarea no encontrada');
    return updated;
  }

  @Post(':name/run-now')
  @ApiOperation({ summary: 'Ejecuta una tarea por nombre, ignorando el intervalo' })
  async runNow(@Param('name') name: string) {
    const result = await this.runDue.runByName(name);
    if (!result.ok) throw new BadRequestException(result.error ?? 'No se pudo ejecutar');
    return { ok: true };
  }
}
