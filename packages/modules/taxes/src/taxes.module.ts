/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 */
import { Global, Module } from '@nestjs/common';
import { CHECKOUT_TAX_RESOLVER_PORT } from '@mitama/contracts';
import { TAXES_TOKENS } from './taxes.tokens';
import { CalculateTaxesUseCase } from './application/tax-use-cases';
import { TaxProviderRegistry, type TaxProvider } from './domain/tax-provider';
import type { StoreTaxSettingsRepository } from './domain/store-tax-settings.repository';
import type { TaxRuleRepository } from './domain/tax-rule.repository';
import { PrismaStoreTaxSettingsRepository } from './infra/prisma-store-tax-settings.repository';
import { PrismaTaxRuleRepository } from './infra/prisma-tax-rule.repository';
import { MxIvaTaxProvider } from './infra/mx-iva-tax-provider';
import { CheckoutTaxResolverAdapter } from './infra/checkout-tax-resolver.adapter';
import { TaxesController } from './http/taxes.controller';

@Global()
@Module({
  controllers: [TaxesController],
  providers: [
    { provide: TAXES_TOKENS.ruleRepository, useClass: PrismaTaxRuleRepository },
    { provide: TAXES_TOKENS.storeSettingsRepository, useClass: PrismaStoreTaxSettingsRepository },
    { provide: TAXES_TOKENS.providers, useFactory: (rules: TaxRuleRepository): TaxProvider[] => [new MxIvaTaxProvider(rules)], inject: [TAXES_TOKENS.ruleRepository] },
    { provide: TAXES_TOKENS.providerRegistry, useFactory: (providers: TaxProvider[]) => new TaxProviderRegistry(providers), inject: [TAXES_TOKENS.providers] },
    {
      provide: CHECKOUT_TAX_RESOLVER_PORT,
      useFactory: (settings: StoreTaxSettingsRepository, registry: TaxProviderRegistry) => new CheckoutTaxResolverAdapter(settings, registry),
      inject: [TAXES_TOKENS.storeSettingsRepository, TAXES_TOKENS.providerRegistry],
    },
    {
      provide: CalculateTaxesUseCase,
      useFactory: (settings: StoreTaxSettingsRepository, registry: TaxProviderRegistry) => new CalculateTaxesUseCase(settings, registry),
      inject: [TAXES_TOKENS.storeSettingsRepository, TAXES_TOKENS.providerRegistry],
    },
  ],
  exports: [TAXES_TOKENS.providerRegistry, CHECKOUT_TAX_RESOLVER_PORT],
})
export class TaxesModule {}
