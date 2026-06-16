import { Injectable } from '@nestjs/common';
import type {
  CheckoutTaxCalculationInput,
  CheckoutTaxCalculationResult,
  CheckoutTaxLineResult,
  CheckoutTaxResolverPort,
} from '@mitama/contracts';
import { TaxProviderRegistry, type TaxCategory } from '../domain/tax-provider';
import type { StoreTaxSettingsRepository } from '../domain/store-tax-settings.repository';

const VALID_CATEGORIES: ReadonlySet<TaxCategory> = new Set(['standard', 'zero', 'exempt']);

/**
 * Adapter del puerto `CheckoutTaxResolverPort` (r13 · sprint1_cierre).
 *
 * Resuelve el `TaxProvider` configurado para la tienda (por defecto
 * `mx-iva`) y le delega el cálculo línea-a-línea. Categorías inválidas o
 * nulas caen a `standard` y se registran como advertencia. El envío NO se
 * grava en el MVP, por lo que aquí solo entran líneas de productos.
 */
@Injectable()
export class CheckoutTaxResolverAdapter implements CheckoutTaxResolverPort {
  constructor(
    private readonly settings: StoreTaxSettingsRepository,
    private readonly registry: TaxProviderRegistry,
  ) {}

  async calculate(input: CheckoutTaxCalculationInput): Promise<CheckoutTaxCalculationResult> {
    const settings = await this.settings.findByStore(input.storeId);
    const providerCode = settings?.providerCode ?? 'mx-iva';
    const provider = this.registry.get(providerCode);
    if (!provider) {
      throw new Error(`Provider de impuestos no registrado: ${providerCode}`);
    }

    const result = await provider.calculate({
      storeId: input.storeId,
      regionId: input.regionId,
      pricesIncludeTax: input.pricesIncludeTax,
      lines: input.lines.map((line) => ({
        lineId: line.lineId,
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxCategory: normalizeCategory(line.taxCategory),
      })),
    });
    if (result.isErr()) throw result.error;

    const lines: CheckoutTaxLineResult[] = result.value.lines.map((line) => ({
      lineId: line.lineId,
      taxCategory: line.taxCategory,
      taxRate: line.taxRate,
      taxableAmount: line.taxableAmount,
      taxAmount: line.taxAmount,
      total: line.total,
    }));

    return {
      taxTotal: result.value.taxTotal,
      subtotal: result.value.subtotal,
      total: result.value.total,
      lines,
      warnings: result.value.warnings,
    };
  }
}

function normalizeCategory(raw: string | null | undefined): TaxCategory | null {
  if (!raw) return null;
  return VALID_CATEGORIES.has(raw as TaxCategory) ? (raw as TaxCategory) : null;
}
