import { BadRequestException, Body, Controller, NotFoundException, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public, RequirePermission } from '@mitama/contracts';
import { CalculateShippingRatesUseCase, CreateShipmentUseCase, UpdateShipmentStatusUseCase } from '../application/shipping-use-cases';
import { ShipmentNotFoundError } from '../domain/errors';
import type { ShippingAddress } from '../domain/shipping-method.entity';
import type { ShipmentStatus } from '../domain/shipment.entity';

class CalculateRatesRequestDto {
  storeId!: string;
  address!: ShippingAddress | null;
  cartTotal!: number;
  weightKg!: number;
}

class CreateShipmentRequestDto {
  orderId!: string;
  trackingNumber?: string | null;
  carrier?: string | null;
}

class UpdateShipmentRequestDto {
  status!: ShipmentStatus;
  trackingNumber?: string | null;
  carrier?: string | null;
}

@ApiTags('shipping')
@Controller('shipping')
export class ShippingController {
  constructor(
    private readonly calculateRates: CalculateShippingRatesUseCase,
    private readonly createShipment: CreateShipmentUseCase,
    private readonly updateShipment: UpdateShipmentStatusUseCase,
  ) {}

  @Post('rates')
  @Public()
  @ApiOperation({ summary: 'Calcula métodos de envío elegibles para una dirección' })
  async rates(@Body() body: CalculateRatesRequestDto) {
    const result = await this.calculateRates.execute(body);
    if (result.isOk()) return result.value;
    throw new BadRequestException(result.error.message);
  }

  @Post('shipments')
  @RequirePermission('shipments.create')
  @ApiOperation({ summary: 'Crea tracking de envío para una orden' })
  async create(@Body() body: CreateShipmentRequestDto) {
    const result = await this.createShipment.execute(body);
    if (result.isOk()) return result.value;
    throw new BadRequestException('No se pudo crear el envío');
  }

  @Post('shipments/:shipmentId/status')
  @RequirePermission('shipments.update')
  @ApiOperation({ summary: 'Actualiza tracking y estado del envío' })
  async status(@Param('shipmentId') shipmentId: string, @Body() body: UpdateShipmentRequestDto) {
    const result = await this.updateShipment.execute({ shipmentId, status: body.status, trackingNumber: body.trackingNumber, carrier: body.carrier });
    if (result.isOk()) return result.value;
    if (result.error instanceof ShipmentNotFoundError) throw new NotFoundException(result.error.message);
    throw new BadRequestException(result.error.message);
  }
}
