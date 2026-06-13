import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NoStoreScope, Public } from '@mitama/contracts';
import { ListPaymentProvidersUseCase } from '../application/list-payment-providers/list-payment-providers.use-case';
import type { PaymentProviderOutput } from '../application/list-payment-providers/list-payment-providers.dto';

@ApiTags('reference-data')
@Controller('payment-providers')
@Public()
@NoStoreScope()
export class PaymentProvidersController {
  constructor(private readonly listPaymentProviders: ListPaymentProvidersUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Lista los proveedores de pago disponibles (catálogo sembrado)' })
  @ApiOkResponse({ description: 'Catálogo de proveedores de pago' })
  async list(): Promise<PaymentProviderOutput[]> {
    const result = await this.listPaymentProviders.execute();
    return result.unwrapOr([]);
  }
}
