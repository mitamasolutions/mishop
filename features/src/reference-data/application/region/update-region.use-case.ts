import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { RegionNotFoundError } from '../../domain/errors';
import type { RegionRepository } from '../../domain/region.repository';
import type { CurrencyRepository } from '../../domain/currency.repository';
import type { CountryRepository } from '../../domain/country.repository';
import type { PaymentProviderRepository } from '../../domain/payment-provider.repository';
import type { UpdateRegionInput } from './region.dto';

export type UpdateRegionError = ValidationError | RegionNotFoundError;

export class UpdateRegionUseCase implements UseCase<UpdateRegionInput, Result<void, UpdateRegionError>> {
  constructor(
    private readonly regions: RegionRepository,
    private readonly currencies: CurrencyRepository,
    private readonly countries: CountryRepository,
    private readonly paymentProviders: PaymentProviderRepository,
  ) {}

  async execute(input: UpdateRegionInput): Promise<Result<void, UpdateRegionError>> {
    const region = await this.regions.findByIdWithDetails(input.regionId);
    if (!region) {
      return err(new RegionNotFoundError(input.regionId));
    }

    const changes: Parameters<typeof region.update>[0] = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        return err(new ValidationError('El nombre de la región no puede estar vacío'));
      }
      changes.name = name;
    }

    if (input.currencyCode !== undefined) {
      const currency = await this.currencies.findByCode(input.currencyCode);
      if (!currency) {
        return err(new ValidationError(`La moneda '${input.currencyCode}' no existe en el catálogo`));
      }
      changes.currencyCode = input.currencyCode;
    }

    if (input.countriesIso2 !== undefined) {
      for (const iso2 of input.countriesIso2) {
        const country = await this.countries.findByIso2(iso2);
        if (!country) {
          return err(new ValidationError(`El país '${iso2}' no existe en el catálogo`));
        }
      }
      changes.countriesIso2 = input.countriesIso2;
    }

    if (input.paymentProviderIds !== undefined) {
      const found = await this.paymentProviders.findByIds(input.paymentProviderIds);
      if (found.length !== input.paymentProviderIds.length) {
        return err(new ValidationError('Uno o más proveedores de pago no existen en el catálogo'));
      }
      changes.paymentProviderIds = input.paymentProviderIds;
    }

    const updated = region.update(changes);

    await this.regions.save(updated, {
      userId: input.actorUserId,
      storeId: null,
      action: 'region.updated',
      entityType: 'region',
      entityId: region.id,
      diff: changes,
    });

    return ok(undefined);
  }
}
