import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NoStoreScope, Public } from '@mitama/contracts';
import { CalculateTaxesUseCase } from '../application/tax-use-cases';
import type { TaxCategory, TaxLineInput } from '../domain/tax-provider';

class CalculateTaxesRequestDto {
  storeId!: string;
  regionId!: string;
  pricesIncludeTax?: boolean;
  lines!: Array<TaxLineInput & { taxCategory?: TaxCategory | null }>;
}

@ApiTags('taxes')
@Controller('taxes')
@NoStoreScope()
export class TaxesController {
  constructor(private readonly calculateTaxes: CalculateTaxesUseCase) {}

  @Post('calculate')
  @Public()
  @ApiOperation({ summary: 'Calcula impuestos de checkout por línea' })
  async calculate(@Body() body: CalculateTaxesRequestDto) {
    const result = await this.calculateTaxes.execute(body);
    if (result.isOk()) return result.value;
    throw new BadRequestException(result.error.message);
  }
}
