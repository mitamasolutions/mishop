import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@mitama/contracts';
import { PrismaService } from '@mitama/data';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Verifica que la API esté viva' })
  @ApiOkResponse({ description: 'La API responde' })
  check(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('db')
  @Public()
  @ApiOperation({ summary: 'Verifica la conexión a la base de datos' })
  @ApiOkResponse({ description: 'La base de datos responde' })
  @ApiServiceUnavailableResponse({ description: 'La base de datos no responde' })
  async checkDb(): Promise<{ status: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException({ status: 'down' });
    }
  }
}
