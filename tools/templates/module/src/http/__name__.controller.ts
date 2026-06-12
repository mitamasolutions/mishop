import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('__name__')
@Controller('__name__')
export class __Name__Controller {
  @Get('status')
  @ApiOperation({ summary: 'Placeholder del módulo __name__' })
  @ApiOkResponse({ description: 'El módulo está registrado' })
  status(): { module: string; status: string } {
    return { module: '__name__', status: 'ok' };
  }
}
